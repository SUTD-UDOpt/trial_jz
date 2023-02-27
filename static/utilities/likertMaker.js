let responsesType1 = ["Not confident at all", "Not confident", "Neutral", "Confident", "Very confident"]
let responsesType2 = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]

function createLikertScale(id, num, start, type){
    if (type == 1){
        var responses = responsesType1
    } else {
        var responses = responsesType2
    }
    for (let i=0; i<num; i++){
        let likertID = "likert" + id + "_" + (start + i)
        let scale = document.createElement("div");
        scale.setAttribute("class", "form-row");

        for (let j=0; j<5; j++){
            let container = document.createElement("label")
            let content = document.createElement("input")
            content.setAttribute("type", "radio")
            content.setAttribute("id", "qn" + id + "_" + (start + i))
            content.setAttribute("name", "radio" + id + "_" + (start + i))
            content.setAttribute("value", responses[j])
            if (j==1){
                content.setAttribute("required", "")
            }
            container.appendChild(content)
            container.appendChild(document.createTextNode(responses[j]))
            scale.appendChild(container)
        }
        document.getElementById(likertID).appendChild(scale)
    }
}

export function initialiseLikert(){
    createLikertScale(1,1,1,1)
    createLikertScale(3,1,2,1)
    createLikertScale(5,1,1,1)
    createLikertScale(7,1,2,1)
    createLikertScale(8,10,0,2)
    createLikertScale(9,12,0,2)
}