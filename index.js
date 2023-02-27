const {readFile, readFileSync} = require('fs');
const cors = require('cors')
const spawner = require('child_process').spawn;
const express = require('express');

// start express server at localhost 3000
const app = express();
app.listen(3000, () => console.log('http://13.212.124.234:3000/'))
app.use(cors({origin:'http://13.212.124.234:3000/', credentials : true}));

// import libraries
app.use('/static', express.static('./static'))
app.use(express.json());

// server immidiately 'gets' home.html and send it to client browser.
app.get('/', (request, response) => {
    readFile('./home.html','utf8', (err,html) => {
        response.send(html)
    })
});

// do something when a call to '/api_python' comes from client side.
app.post('/api_python', (request,response) => {
    try{
        // use spawner to run python using the incoming json request, after formatting with stringify.
        const python_process = spawner('python',['./optimise_weight_v2.py', JSON.stringify(request.body)]);
        // if python printed something, print the output
        var newsItems = '';
        console.log(python_process)
        python_process.stdout.on("data", function (data) {
            newsItems += data.toString();
            console.log(data)
        });
        console.log("hi" + newsItems)

        python_process.stdout.on("end", function () {
            if (newsItems.includes("failed")){
                console.error(`Not possible to build...`);
                response.json({data:0});
            } else {
                try {
                    var jsonParse = JSON.parse(newsItems);
                    console.log(jsonParse);
                    response.json(jsonParse);
                } catch(error){
                    console.log(error);
                    response.json({data:1});
                }
            }
        });
    } catch(error) {
        console.error(`Something is very wrong...`);
    }
});