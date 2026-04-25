
import {Schema} from "./schema.js"
import {Mapper} from "./mapper.js"
import {App} from "./app.js"

class Editor {
  #schema
  #gist_id
  #exercise_name
  #er_diagram_data
  constructor () {
    this.#schema = new Schema(this)
    this.init()
  }
  async loadExerciseData () {
   /* //const params = new URLSearchParams(document.location.search)
    this.#gist_id = "1332da685857603b519348f010185df3"
    //this.#exercise_name = params.get('ex_name')
    this.#exercise_name = "1.1"
    const result = await fetch('https://api.github.com/gists/'+this.#gist_id)
    const data = await result.json()
    const exercise_content = data.files[this.#exercise_name].content*/
    const params = new URLSearchParams(document.location.search)
    const exerciseId = params.get('id')

    //const result = await fetch("./uploads/" + exerciseId + ".json")
    const result= await fetch("jsonServlet?id=" + exerciseId)
    const data = await result.json()

    const exercise_content = JSON.stringify(data)
    App.showGraph(exercise_content)
    this.#er_diagram_data = this.cleanERDiagram(JSON.parse(exercise_content))
    console.log(this.#er_diagram_data)
    
     
  
}
  static searchInAttributes (el, id) {
    if (el.id === id) return el
    const list = el.attributes != null ? el.attributes : el.subattributes
    for(const a of list){
      let attr = Editor.searchInAttributes(a, id)
      if (attr != null) return attr
    }
    return null
  }
  static searchAttribute (erd, id) {
    for(const ent of erd.entities){
      let attr = Editor.searchInAttributes(ent, id)
      if (attr != null) return attr
    }
    for(const rel of erd.relationships){
      let attr = Editor.searchInAttributes(rel, id)
      if (attr != null) return attr
    }
    return null
  }
 
  cleanERDiagram (erdFileContent) {
    const erd = {entities: [], relationships: [], specializations: [], categories: []}
    // 2. Procesar Puntos de Conexión (El círculo de la herencia)
    const connectionPoints = erdFileContent.cells.filter(c => c.type === 'erd.ConnectionPoint');
    const inheritanceLinks = erdFileContent.cells.filter(c => c.type === 'erd.InheritanceLink');

    connectionPoints.forEach(cp => {
        if (cp.connectionType === 'specialization') {
            const spec = {
                superclassEntityName: "",
                subclassEntityNames: [],
                isTotal: cp.isTotal || false,
                id: cp.id
            };

            // Buscar la superclase conectada a este punto
           /* const upLink = inheritanceLinks.find(l => l.target.id === cp.id && l.linkType === 'connection2superclass');
            if (upLink && upLink.subclass) spec.superclassEntityName = upLink.source.labelText;

            // Buscar las subclases conectadas
            const downLinks = inheritanceLinks.filter(l => l.target.id === cp.id && l.linkType === 'connection2subclass');
            spec.subclassEntityNames = downLinks.map(l => l.source.labelText);*/
                // Buscar la superclase conectada a este punto
            const upLink = inheritanceLinks.find(l => l.target.id === cp.id && l.linkType === 'connection2superclass');
            if (upLink) {
                // IMPORTANTE: En el JSON de JointJS, el nombre está en 'subclass.labelText' del link
                // o hay que buscar la entidad por ID. Lo más seguro es esto:
                const superEnt = erdFileContent.cells.find(c => c.id === upLink.source.id);
                if (superEnt) spec.superclassEntityName = superEnt.labelText;
            }

            // Buscar las subclases conectadas
            const downLinks = inheritanceLinks.filter(l => l.target.id === cp.id && l.linkType === 'connection2subclass');
            spec.subclassEntityNames = downLinks.map(l => {
                const subEnt = erdFileContent.cells.find(c => c.id === l.source.id);
                return subEnt ? subEnt.labelText : "";
            }).filter(name => name !== "");

           // erd.specializations.push(spec);
           if (spec.superclassEntityName) erd.specializations.push(spec);
        }
    });
        
        
    // --- CRUCIAL: Eliminar los elementos de herencia antes del while para evitar BUCLE INFINITO ---
    erdFileContent.cells = erdFileContent.cells.filter(c => 
        c.type !== 'erd.ConnectionPoint' && 
        c.type !== 'erd.InheritanceLink' &&
        c.type !== 'erd.Specialization' &&
        c.type !== 'erd.Category'
    );
    
    let i = 0
    while (erdFileContent.cells.length > 0){
      i = i % erdFileContent.cells.length
      const el = erdFileContent.cells[i]
      if (el.type === 'standard.Link' || el.type === 'erd.Attribute' || el.type === 'erd.Relation'){
        erdFileContent.cells.splice(i,1)
      }
      else if (el.type === 'erd.Entity'){
        let entity = erd.entities.find((e) => e.id === el.id)
        if (entity != null) continue
        entity = {
          name: el.labelText,
          isWeak: el.isWeak,
          attributes: [],
          id: el.id
        }
        erd.entities.push(entity)
        erdFileContent.cells.splice(i,1)
      } 
      else if (el.type === 'erd.AttributeLink'){
        // distinguir origen: entidad, relación, atributo
        let targetType = el.target.type
        let originType = el.source.type
        
        if ((targetType == 'erd.Entity' && originType == 'erd.Attribute') || (originType == 'erd.Entity' && targetType == 'erd.Attribute')) {
          const entityEl = targetType == 'erd.Entity' ? el.target : el.source
          const attrEl =  targetType == 'erd.Attribute' ? el.target : el.source
          let entity = erd.entities.find((e) => e.id === entityEl.id)
          if (entity == null){
            entity = {name: entityEl.labelText, isWeak: entityEl.isWeak, attributes: [], id: entityEl.id}
            erd.entities.push(entity)
          }
          let attr = entity.attributes.find((a) => a.id == attrEl.id)
          if (attr == null){
              attr = {
              name: attrEl.labelText,
              isMultivalued: attrEl.isMultivaluated,
              isDerivated: attrEl.isDerivated,
              isKey: attrEl.isKey,
              isPartialKey: attrEl.isPartialKey,
              subattributes: [],
              id: attrEl.id
            }
            entity.attributes.push(attr)
          } 
          erdFileContent.cells.splice(i,1)
          
        }
        else if ((targetType == 'erd.Relation' && originType == 'erd.Attribute') || (originType == 'erd.Relation' && targetType == 'erd.Attribute')) {         
          const relEl = targetType == 'erd.Relation' ? el.target : el.source
          const attrEl =  targetType == 'erd.Attribute' ? el.target : el.source
          let relationship = erd.relationships.find((r) => r.id === relEl.id)
          if (relationship == null){
            relationship = {id: relEl.id, participants: [], label: relEl.labelText, isIdentifier: relEl.isIdentifier, attributes: []}
            erd.relationships.push(relationship)
          }
          let attr = relationship.attributes.find((a) => a.id === attrEl.id)
          if (attr == null){
            attr = {
              name: attrEl.labelText,
              isMultivalued: attrEl.isMultivaluated,
              isDerivated: attrEl.isDerivated,
              isKey: attrEl.isKey,
              isPartialKey: attrEl.isPartialKey,
              subattributes: [],
              id: attrEl.id
            }
            relationship.attributes.push(attr)
          } 
          erdFileContent.cells.splice(i,1)
        }
        else if (targetType == 'erd.Attribute' && originType == 'erd.Attribute'){
          const sourceAttr = Editor.searchAttribute(erd, el.source.id)
          const targetAttr = Editor.searchAttribute(erd, el.target.id) 
          let parentAttrEl, childAttrEl
          if (sourceAttr != null){
            parentAttrEl = el.source
            childAttrEl = el.target
          } 
          else if (targetAttr != null){
            parentAttrEl = el.target
            childAttrEl = el.source
          }
          else {
            i++
            continue
          }
          let subAttr = {
            name: childAttrEl.labelText,
            isMultivalued: childAttrEl.isMultivaluated,
            isDerivated: childAttrEl.isDerivated,
            isKey: childAttrEl.isKey,
            isPartialKey: childAttrEl.isPartialKey,
            subattributes: [],
            id: childAttrEl.id
          }
          const parentAttr = sourceAttr != null ? sourceAttr : targetAttr
          parentAttr.subattributes.push(subAttr)
          erdFileContent.cells.splice(i,1)
        }
      } 
      else if (el.type === 'erd.RelationshipLink'){
        let targetType = el.target.type
        let originType = el.source.type
        const relEl = targetType == 'erd.Relation' ? el.target : el.source
        const entityEl = targetType == 'erd.Entity' ? el.target : el.source
        let relationship = erd.relationships.find((r) => r.id === relEl.id)
        if (relationship == null){
          relationship = {id: relEl.id, participants: [], label: relEl.labelText, isIdentifier: relEl.isIdentifier, attributes: []}
          erd.relationships.push(relationship)
        }
        let participant = relationship.participants.find((p) => p.id === entityEl.id)
        if (participant == null){
          participant = {
            entityName: entityEl.labelText,
            id: entityEl.id,
            minCardinality: el.minCard,
            maxCardinality: el.maxCard
          }
          relationship.participants.push(participant)
        }
        erdFileContent.cells.splice(i,1);
      }
        else if (el.type === 'erd.Specialization') {
          const specialization = {
              superclassEntityName: el.superclass, // Asegúrate que 'superclass' es el atributo del JSON de JointJS
              subclassEntityNames: el.subclasses || [], 
              isTotal: el.isTotal || false,
              allowsOverlapping: el.isOverlapping || false,
              id: el.id
          };
          erd.specializations.push(specialization);
          erdFileContent.cells.splice(i, 1);
        }
        else if (el.type === 'erd.Category') {
          const category = {
              categoryEntityName: el.categoryName,
              superclassEntityNames: el.superclasses || [],
              isTotal: el.isTotal || false,
              id: el.id
          };
          erd.categories.push(category);
          erdFileContent.cells.splice(i, 1);
        }
    }
    return erd
    // target
    /*
    {
      entities: [
          {
              name: X,
              isWeak: false/true,
              attributes: [
                  {
                      name: X,
                      isKey: true/false,
                      isMultivalued: true/false,
                      isDerivate: true/false,
                      isPartialKey: true/false,
                      subattributes: [
                          {
                              name: ...
                          }
                      ]
                  }, ...
              ]
          }
      ],
      relationships: [
          {
              label: X,
              participants: [
                  {   
                      entityName: X,
                      minCardinality: 0/1/N,
                      maxCardinality: 1/N
                  } ...
              ],
              isIdentificator: true/false, // para tipos de entidad débiles
              attributes: [
                  {name...}
              ]
          }, ...
      ],
      specializations: [
          {
              superclassEntityName: X,
              subclassEntityNames: [X, Y, ...],
              isTotal: true/false,
              allowsOverlapping: true/false
          }, ...
      ],
      categories: [
          {
              categoryEntityName: X,
              superclassEntityNames: [X, Y, ...],
              isTotal: true/false
          }
      ]
    }
    */

    // file
    /*

    */

  }
 
  showMappingResult (result) {
    let elClass, backgroundColor, textColor, imgSrc
    if (result.isCorrect){
      elClass = 'success_mapping_message'
     // imgSrc = './images/happy.png'
    }
    else {
      elClass = 'error_mapping_message'
      //imgSrc = './images/sad.png'
    }
    const template = document.querySelector('#toast_template')
    const clone = template.content.cloneNode(true)
    //clone.querySelector('.toast_result_icon').src = imgSrc
    clone.querySelector('.toast_message').innerText = result.message
    clone.querySelector('.toast_message').classList.add(elClass)
    const cont = document.createElement('div')
    cont.id = 'toast_overlay'
    cont.addEventListener('click',(e) => {
      e.currentTarget.parentNode.removeChild(e.currentTarget)
    })
    cont.appendChild(clone)
    document.body.appendChild(cont)
  }

testMapping() {
    const mapTestButton = document.querySelector("#mapCheck");
    if (mapTestButton != null) {
        mapTestButton.addEventListener('click', (e) => {
            const s = this.minimizeSchema();
            const res = Mapper.checkSolution(this.#er_diagram_data, s);

            // CLAVE 1: Definir si es correcto basado en lo que devuelve el Mapper
            // Normalmente devuelve un objeto con isCorrect: true/false
            const esCorrecto = (res === null || (res && res.isCorrect === true));

            let finalRes = res;
            
            // CLAVE 2: Solo forzar el mensaje "MAL" si REALMENTE hay un error
            // Si esCorrecto es true, no debemos entrar aquí
            if (!esCorrecto && window.esEvaluable === true) {
                finalRes = { isCorrect: false, message: "MAL" };
            }

            this.showMappingResult(finalRes);
            
            // 3. SI ESTÁ PERFECTO, mostramos el botón
            if (esCorrecto) {
                const btnSiguiente = document.getElementById("btnSiguiente");
                
                if (btnSiguiente) {
                    // Forzamos visibilidad
                    btnSiguiente.style.display = "block";

                    const params = new URLSearchParams(window.location.search);
                    const id = params.get("id");

                    if (id) {
                        // Notificar al servidor
                        fetch("Gestionador?accion=completar&id=" + id);

                        // Programar el salto
                        btnSiguiente.onclick = () => {
                            window.location.href = "Gestionador?accion=siguiente&id=" + id;
                        };
                    }
                }
            }
        });
    }
}
  
 /* testMapping (){
    const mapTestButton = document.querySelector("#mapCheck")
    if (mapTestButton != null){
      mapTestButton.addEventListener('click',(e) => {
        const s = this.minimizeSchema()
        const res = Mapper.checkSolution(this.#er_diagram_data, s)
        this.showMappingResult(res)
        
        if(res.isCorrect){
           // alert("Ejercicio correcto")
            
            const params = new URLSearchParams(window.location.search)
            const id = params.get("id")
            fetch("Gestionador?accion=completar&id=" + id) //avisar al servlet del ejercicio completo
          
            //  seguir marcando como completado
            const btnSiguiente= document.getElementById("btnSiguiente")
            if(btnSiguiente){
                btnSiguiente.style.display="block"
                btnSiguiente.onclick=()=>{
                    window.location.href="Gestionador?accion=siguiente&id=" + id;
                }
            }
            //fetch("Gestionador?accion=completar&id=" + id)

           // document.getElementById("btnSiguiente").style.display ="block"
        }
      })
    }
  }*/
  minimizeSchema() {
    const studentSolution = {
      relations: []
    }
    for (const r of this.#schema.relations){
      const rel = {
        name: r.name,
        attributes: [],
        fks: []
      }
      for (const a of r.attributes){
        const at = {
          name: a.name,
          isPK: a.isPK
        }
        rel.attributes.push(at)
      }
      for (const fk of r.fks){
        const f = {
          targetRelation: fk.targetRelation.name,
          attributes: fk.attributes.map((a) => a.name)
        }
        rel.fks.push(f)
      }
      studentSolution.relations.push(rel)
    }
    return studentSolution
  }
  async init () {
    const newRelationButton = document.querySelector("#newRelation")
    if (newRelationButton != null){
      newRelationButton.addEventListener('click',(e) => {
        this.#schema.createRelation()
      })
    }
    this.testMapping()
    await this.loadExerciseData()
  }
  destroyActions () {
    this.destroyRelationActions()
    this.destroyAttributeActions()
    this.destroyFKActions()
  }
  destroyRelationActions () {
    const relActionConts = document.querySelectorAll('.relationActionsContainer')
    for (const c of relActionConts){
      c.parentNode.removeChild(c)
    }
  }
  showRelationActions () {
    const selectedRelation = document.querySelector('.relation.selected')
    this.destroyActions()
    const selAttrs = document.querySelectorAll('.attribute.selected')
    for(s of selAttrs) s.classList.toggle('selected')

    if (selectedRelation == null){
      // incorrect call
      return // destroyRelationActions()
    }

    const actionTemplate = document.querySelector('#relation_actions_template')
    const relActionContainer = actionTemplate.content.clone(true)
    relActionContainer.querySelector('.editAction').addEventListener('click',(e) => {
      onEditRelationClick() // todo
      e.stopPropagation()
      e.preventDefault()
    })


    relActionContainer.querySelector('.deleteAction').addEventListener('click',(e) => {
      onDeleteRelationClick() // todo
      e.stopPropagation()
      e.preventDefault()
    })
    
    const pos = selectedRelation.querySelector('.relationName').getBoundingClientRect()
    document.body.appendChild(relActionContainer)
    const contPos = relActionContainer.getBoundingClientRect()
    relActionContainer.style.top = `calc(${pos.top}px)`
    relActionContainer.style.left = `calc(${pos.right}px + 1em)`
  }
}

const editor = new Editor()
document.addEventListener('click',() => {
  const editableEls = document.querySelectorAll('div[contenteditable]')
  for (const el of editableEls){
    el.removeAttribute('contenteditable')
  }
  const selectedEls = document.querySelectorAll('.selected')
  for (const el of selectedEls){
    el.classList.remove('selected')
  }
})

