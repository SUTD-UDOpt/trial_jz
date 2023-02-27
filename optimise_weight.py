import json
from datetime import datetime
import ast
import sys
import pickle
import pandas as pd
import numpy as np
from utility import *
import geopandas as gpd
pd.options.mode.chained_assignment = None  # default='warn'
import compute_rhino3d.Util
import compute_rhino3d.Grasshopper as gh
compute_rhino3d.Util.authToken = ""
#compute_rhino3d.Util.url = "http://localhost:8081/"
compute_rhino3d.Util.url = "http://52.221.220.104:80/"
compute_rhino3d.Util.apiKey = '0hOfevzxs49OfbXDqyUx'

from pymoo.core.problem import ElementwiseProblem
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.operators.crossover.sbx import SBX
from pymoo.operators.mutation.pm import PM
from pymoo.factory import get_sampling, get_crossover, get_mutation
from pymoo.factory import get_termination
from pymoo.optimize import minimize
from pymoo.config import Config
Config.show_compile_hint = False

# load database
rn_gdf = gpd.read_file('static\geojson\Clean_MP19_RoadNetwork_Tampines.geojson').to_crs(3857)
lu_gdf = gpd.read_file('static\geojson\Clean_MP19_LandUse_Tampines.geojson').to_crs(3857)

# json input as dict variable
user_input = ast.literal_eval(sys.argv[1])

"""
user_input = {
    "OptimizationType": "advanced",
    "Parcel_ID": "LU_13",
    "GenCount": "2",
    "PopCount": "2",
    "BKeySelection": [2,4,5,6,10,12,14],
    "ParameterBounds": {
        "BKeyXScale": [0.3,1],
        "BKeyYScale": [0.3,1],
        "GridAngle": [54,108],
        "GridSpacing": [16,22],
        "ParcelStoreyScale": [0.3,0.6]
        },
    "MutationRate": 0.4,
    "CrossOverRate": 0.9
    }
"""



# get relevent data about selected parcel in json format
selected_parcel_json = json.loads(lu_gdf.loc[lu_gdf.UD_ID == user_input['Parcel_ID']].to_json())['features'][0]
selected_parcel_json['properties']['UD_EdgeCategory'], selected_parcel_json['properties']['UD_EdgeClosestPoint'] = GetEdgeCategory(user_input['Parcel_ID'],rn_gdf, lu_gdf)
if user_input['OptimizationType'] == 'simple':
    selected_parcel_json['properties']['BKeySelection'] = list(range(15))
else:
    selected_parcel_json['properties']['BKeySelection'] = user_input['BKeySelection']


class TampinesMOOProblem(ElementwiseProblem):
    def __init__(self):
        super().__init__(n_var=5,
                         n_obj=2,
                         n_constr=0,
                         xl=np.array([user_input['ParameterBounds'][key][0] for key in user_input['ParameterBounds'].keys()]),
                         xu=np.array([user_input['ParameterBounds'][key][1] for key in user_input['ParameterBounds'].keys()]))
    def _evaluate(self, x, out, *args, **kwargs):

        # run parametric model, module B
        filename = 'static\gh\module B_showcase.ghx'
        # parameters are fixed variables from selected parcel json, and optimizable variables "x"
        parameters = [json.dumps(selected_parcel_json)] + list(x)
        # ids for parameters
        ids = ["ParcelJSON"] + list(user_input['ParameterBounds'].keys())
        # evaluate grasshopper
        output = EvaluateGrasshopper(filename, parameters, ids)
        # if output is returned
        if output['RH_OUT:BuildingJSON']['{0}']:
            # run simulation model, module C
            filename = 'static\gh\module C_showcase.ghx'
            parameters = [json.loads(output['RH_OUT:BuildingJSON']['{0}'][0]['data'])]
            ids = ["BuildingJSON"]
            output = EvaluateGrasshopper(filename, parameters, ids)
            fitness_scores = [float(value['{0}'][0]['data']) for key,value in output.items()]

            out["F"] = fitness_scores
            out["G"] = []
        else:
            out["F"] = [9999,9999]
            out["G"] = []

class TampinesSOOProblem(ElementwiseProblem):
    def __init__(self):
        super().__init__(n_var=5,
                         n_obj=1,
                         n_constr=0,
                         xl=np.array([user_input['ParameterBounds'][key][0] for key in user_input['ParameterBounds'].keys()]),
                         xu=np.array([user_input['ParameterBounds'][key][1] for key in user_input['ParameterBounds'].keys()]))
    def _evaluate(self, x, out, *args, **kwargs):

        # run parametric model, module B
        filename = 'static\gh\module B_showcase.ghx'
        parameters = [json.dumps(selected_parcel_json)] + list(x)
        ids = ["ParcelJSON"] + list(user_input['ParameterBounds'].keys())
        output = EvaluateGrasshopper(filename, parameters, ids)

        if output['RH_OUT:BuildingJSON']['{0}'] != []:
            # run simulation model, module C
            filename = 'static\gh\module C_showcase.ghx'
            parameters = [json.loads(output['RH_OUT:BuildingJSON']['{0}'][0]['data'])]
            ids = ["BuildingJSON"]
            output = EvaluateGrasshopper(filename, parameters, ids)
            fitness_scores = [float(value['{0}'][0]['data']) for key,value in output.items()]
            fitness_scores[0] = user_input['ObjectiveWeights'][0] * Remap(fitness_scores[0],0,1.7)
            fitness_scores[1] = user_input['ObjectiveWeights'][1] * Remap(fitness_scores[1],0,4000)
            fitness_scores = np.average(fitness_scores)
            out["F"] = fitness_scores
            out["G"] = []
        else:
            out["F"] = [9999]
            out["G"] = []

# solve MOO or SOO accordingly
if 'ObjectiveWeights' in user_input:
    problem = TampinesSOOProblem()
else:
    problem = TampinesMOOProblem()

res = minimize(
    problem = problem, 
    algorithm = NSGA2(
        pop_size = int(user_input['PopCount']),
        n_offsprings = int(int(user_input['PopCount'])/2),
        crossover=SBX(prob=user_input["CrossOverRate"], eta=15),
        mutation=PM(prob=user_input["MutationRate"], eta=20),
        ), 
    termination = get_termination("n_gen", int(user_input['GenCount'])),
    seed=1,
    save_history=True, 
    verbose = False)

df = ReadResult(res)

# return error message if ALL solutions failed for site
if all(v == 9999 for v in df.f0.to_list()):
    print("site totally failed")

else:
    # get best 5 scores if SOO
    if 'ObjectiveWeights' in user_input:
        ndf = df.sort_values(by=['f0']).iloc[:5,:]
    # get pareto set if problem is MOO
    else:
        ndf = GetPareto(df,['f0','f1'])
    ndf_dict = ndf.transpose().to_dict()

    # run grasshopper to create dracomesh for pareto optimal solutions, module C
    for i, row in ndf.iterrows():
        filename = 'static\gh\module B_showcase.ghx'
        parameters = [json.dumps(selected_parcel_json)] + [row.x0,row.x1,row.x2,row.x3,row.x4]
        ids = ["ParcelJSON"] + list(user_input['ParameterBounds'].keys())
        output = EvaluateGrasshopper(filename, parameters, ids)
        # saves 2 dracomeshes, 1) base and 2) buildings
        ndf_dict[i]['BuildingDraco'] = [output['RH_OUT:BuildingDracoMesh']['{0}'][0]['data'],output['RH_OUT:BuildingDracoMesh']['{0}'][1]['data']]
    # output to client side
    print(json.dumps(ndf_dict))
