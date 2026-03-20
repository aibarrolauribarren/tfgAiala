
const exercise_gist_id = '1332da685857603b519348f010185df3'

const result = await fetch('https://api.github.com/gists/'+exercise_gist_id)
const data = await result.json()
const exercise_list = Object.values(data.files)

const template = document.querySelector('#ex_template')
const insertionPoint = document.querySelector('#ex_container')
exercise_list.forEach((ex) => {
    const clone = template.content.cloneNode(true).querySelector('.exercise')
    clone.querySelector('.exercise_name').innerText = ex.filename
    insertionPoint.appendChild(clone)
    clone.addEventListener('click',(e) => {
        location.href = './mapping.html?id='+exercise_gist_id+"&ex_name="+ex.filename
    })
})