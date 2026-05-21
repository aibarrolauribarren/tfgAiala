
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
/* async loadExerciseData () {
   /* //const params = new URLSearchParams(document.location.search)
    this.#gist_id = "1332da685857603b519348f010185df3"
    //this.#exercise_name = params.get('ex_name')
    this.#exercise_name = "1.1"
    const result = await fetch('https://api.github.com/gists/'+this.#gist_id)
    const data = await result.json()
    const exercise_content = data.files[this.#exercise_name].content*/
 /*   const params = new URLSearchParams(document.location.search)
    const exerciseId = params.get('id')

    //const result = await fetch("./uploads/" + exerciseId + ".json")
    const result= await fetch("jsonServlet?id=" + exerciseId)
    const data = await result.json()

    const exercise_content = JSON.stringify(data)
    App.showGraph(exercise_content)
    this.#er_diagram_data = this.cleanERDiagram(JSON.parse(exercise_content))
    console.log(this.#er_diagram_data)
    
     
  
}*/
    
   async loadExerciseData () {
    const params = new URLSearchParams(document.location.search)
    const exerciseId = params.get('id')

    try {
        const result = await fetch("jsonServlet?id=" + exerciseId)
        const data = await result.json()

        // Control de sesión caducada
        if (data && data.error === "session_expired") {
            alert("Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.");
            window.location.href = "index.jsp";
            return;
        }

        // 1. PINTAR EL DIAGRAMA DE FONDO (Siempre se ejecuta, garantizado)
        const exercise_content = JSON.stringify(data)
        App.showGraph(exercise_content)
        this.#er_diagram_data = this.cleanERDiagram(JSON.parse(exercise_content))
        console.log("Diagrama cargado con éxito.");

        // 2. RENDERIZAR LAS TABLAS DEL ALUMNO (Si es que existen en la BD)
        if (data && data.progresoAlumno) {
            console.log("Restaurando las tablas del alumno...", data.progresoAlumno);
            this.#schema.cargarEsquemaGuardado(data.progresoAlumno);
        }

    } catch (error) {
        console.error("Error cargando los componentes del ejercicio:", error);
    }
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
 cleanERDiagram(erdFileContent) {
    const erd = { entities: [], relationships: [], specializations: [], categories: [] };
    let i = 0;

    while (erdFileContent.cells.length > 0) {
        i = i % erdFileContent.cells.length;
        const el = erdFileContent.cells[i];

        // 1. Limpieza de elementos básicos
        if (el.type === 'standard.Link' || el.type === 'erd.Attribute' || el.type === 'erd.Relation') {
            erdFileContent.cells.splice(i, 1);
        }
        // 2. Entidades
        else if (el.type === 'erd.Entity') {
            let entity = erd.entities.find((e) => e.id === el.id);
            if (entity == null) {
                entity = {
                    name: el.labelText,
                    isWeak: el.isWeak,
                    attributes: [],
                    id: el.id
                };
                erd.entities.push(entity);
            }
            erdFileContent.cells.splice(i, 1);
        }
        // 3. Atributos (Entidad o Relación)
        else if (el.type === 'erd.AttributeLink') {
            let targetType = el.target.type;
            let originType = el.source.type;
            
            if ((targetType == 'erd.Entity' && originType == 'erd.Attribute') || (originType == 'erd.Entity' && targetType == 'erd.Attribute')) {
                const entityEl = targetType == 'erd.Entity' ? el.target : el.source;
                const attrEl = targetType == 'erd.Attribute' ? el.target : el.source;
                let entity = erd.entities.find((e) => e.id === entityEl.id);
                if (entity == null) {
                    entity = { name: entityEl.labelText, isWeak: entityEl.isWeak, attributes: [], id: entityEl.id };
                    erd.entities.push(entity);
                }
                let attr = entity.attributes.find((a) => a.id == attrEl.id);
                if (attr == null) {
                    entity.attributes.push({
                        name: attrEl.labelText,
                        isMultivalued: attrEl.isMultivaluated,
                        isDerivated: attrEl.isDerivated,
                        isKey: attrEl.isKey,
                        isPartialKey: attrEl.isPartialKey,
                        subattributes: [],
                        id: attrEl.id
                    });
                }
                erdFileContent.cells.splice(i, 1);
            }
            else if ((targetType == 'erd.Relation' && originType == 'erd.Attribute') || (originType == 'erd.Relation' && targetType == 'erd.Attribute')) {
                const relEl = targetType == 'erd.Relation' ? el.target : el.source;
                const attrEl = targetType == 'erd.Attribute' ? el.target : el.source;
                let relationship = erd.relationships.find((r) => r.id === relEl.id);
                if (relationship == null) {
                    relationship = { id: relEl.id, participants: [], label: relEl.labelText, isIdentifier: relEl.isIdentifier, attributes: [] };
                    erd.relationships.push(relationship);
                }
                if (!relationship.attributes.find((a) => a.id === attrEl.id)) {
                    relationship.attributes.push({
                        name: attrEl.labelText,
                        isMultivalued: attrEl.isMultivaluated,
                        isDerivated: attrEl.isDerivated,
                        isKey: attrEl.isKey,
                        isPartialKey: attrEl.isPartialKey,
                        subattributes: [],
                        id: attrEl.id
                    });
                }
                erdFileContent.cells.splice(i, 1);
            }
            else if (targetType == 'erd.Attribute' && originType == 'erd.Attribute') {
                const sourceAttr = Editor.searchAttribute(erd, el.source.id);
                const targetAttr = Editor.searchAttribute(erd, el.target.id);
                let parentAttr = sourceAttr || targetAttr;
                let childAttrEl = sourceAttr ? el.target : el.source;

                if (parentAttr) {
                    parentAttr.subattributes.push({
                        name: childAttrEl.labelText,
                        isMultivalued: childAttrEl.isMultivaluated,
                        isDerivated: childAttrEl.isDerivated,
                        isKey: childAttrEl.isKey,
                        isPartialKey: childAttrEl.isPartialKey,
                        subattributes: [],
                        id: childAttrEl.id
                    });
                    erdFileContent.cells.splice(i, 1);
                } else {
                    i++;
                }
            }
        }
        // 4. Links de Relación
        else if (el.type === 'erd.RelationshipLink') {
            const relEl = el.target.type === 'erd.Relation' ? el.target : el.source;
            const entityEl = el.target.type === 'erd.Entity' ? el.target : el.source;
            let relationship = erd.relationships.find((r) => r.id === relEl.id);
            if (relationship == null) {
                relationship = { id: relEl.id, participants: [], label: relEl.labelText, isIdentifier: relEl.isIdentifier, attributes: [] };
                erd.relationships.push(relationship);
            }
            if (!relationship.participants.find((p) => p.id === entityEl.id)) {
                relationship.participants.push({
                    entityName: entityEl.labelText,
                    id: entityEl.id,
                    minCardinality: el.minCard,
                    maxCardinality: el.maxCard
                });
            }
            erdFileContent.cells.splice(i, 1);
        }
        // 5. Especializaciones y Categorías (ConnectionPoint)
        else if (el.type === 'erd.ConnectionPoint') {
            if (el.connectionType === 'category') {
                // CATEGORÍA: Plural 'superclassEntityName' y singular 'categoryEntityName'
                const cat = { categoryEntityName: "", superclassEntityName: [], isTotal: el.isTotal, type: el.labelText || 'U' };
                const linkElements = [...(el.superclassConnections || []), ...(el.subclassConnections || [])];
                linkElements.forEach(scId => {
                    const scel = erdFileContent.cells.find((c) => c.id == scId);
                    if (!scel) return;
                    const entName = (scel.source.id === el.id) ? scel.target.labelText : scel.source.labelText;
                    
                    if (scel.linkType === 'connection2superclass') cat.superclassEntityName.push(entName);
                    else cat.categoryEntityName = entName;
                    
                    const posL = erdFileContent.cells.findIndex(c => c.id === scId);
                    if (posL > -1) erdFileContent.cells.splice(posL, 1);
                });
                erd.categories.push(cat);
            } 
           else if (el.connectionType === 'specialization') {
            const sp = { 
                superclassEntityName: "", 
                subclassEntityNames: [], 
                isTotal: el.isTotal, 
                allowsOverlapping: el.labelText == 'o' 
            };

            const linkElements = [...(el.superclassConnections || []), ...(el.subclassConnections || [])];

            linkElements.forEach(scId => {
                const scel = erdFileContent.cells.find((c) => c.id == scId);
                if (!scel) return;

                const entName = (scel.source.id === el.id) ? scel.target.labelText : scel.source.labelText;

                if (scel.linkType === 'connection2superclass') {
                    sp.superclassEntityName = entName;
                } else if (scel.linkType === 'connection2subclass') {
                    sp.subclassEntityNames.push(entName);
                }

                // ¡NO HACEMOS SPLICE AQUÍ DENTRO!
            });

            // Borramos todos los links de una vez fuera del bucle
            linkElements.forEach(scId => {
                const posL = erdFileContent.cells.findIndex(c => c.id === scId);
                if (posL > -1) erdFileContent.cells.splice(posL, 1);
            });

            erd.specializations.push(sp);
        }
            const pos = erdFileContent.cells.findIndex((c) => c.id === el.id);
            if (pos > -1) erdFileContent.cells.splice(pos, 1);
        }
        else if (el.type === 'erd.InheritanceLink') {

            const subclassName = el.subclass.labelText;
            const superclassName = el.superclass.labelText;

            // Buscar si ya existe una especialización para esta subclase
            let sp = erd.specializations.find(s =>
                s.subclassEntityNames.includes(subclassName)
            );

            // Si no existe, crearla
            if (!sp) {
                sp = {
                    superclassEntityName: [],
                    subclassEntityNames: [subclassName],
                    isTotal: false,
                    allowsOverlapping: false
                };

                erd.specializations.push(sp);
            }

            // Añadir superclase si no está
            if (!sp.superclassEntityName.includes(superclassName)) {
                sp.superclassEntityName.push(superclassName);
            }

            erdFileContent.cells.splice(i, 1);
        }
        else {
            i++; // Para evitar bucles infinitos si hay un tipo no reconocido
        }
    }
    // =========================================================
    // --- BLOQUE NUEVO: UNIFICACIÓN DE ESPECIALIZACIONES ---
    // =========================================================
    const unificadas = [];
    erd.specializations.forEach(spec => {
        // Normalizamos la hija (siempre como string)
        const subName = Array.isArray(spec.subclassEntityNames) ? spec.subclassEntityNames[0] : spec.subclassEntityNames;
        
        // Buscamos si ya tenemos una especialización para esta hija
        let existente = unificadas.find(u => {
            const uSubName = Array.isArray(u.subclassEntityNames) ? u.subclassEntityNames[0] : u.subclassEntityNames;
            return uSubName === subName;
        });

        if (existente) {
            // Si ya existe, unimos los padres (superclases)
            let nuevosSupers = Array.isArray(spec.superclassEntityName) ? spec.superclassEntityName : [spec.superclassEntityName];
            let supersActuales = Array.isArray(existente.superclassEntityName) ? existente.superclassEntityName : [existente.superclassEntityName];
            
            // Usamos Set para evitar padres duplicados
            existente.superclassEntityName = [...new Set([...supersActuales, ...nuevosSupers])];
        } else {
            // Si es nueva, la añadimos asegurando que superclass sea un array
            const copia = {...spec};
            if (!Array.isArray(copia.superclassEntityName)) {
                copia.superclassEntityName = [copia.superclassEntityName];
            }
            unificadas.push(copia);
        }
    });

    erd.specializations = unificadas;
    // =========================================================

    return erd;
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
                      /*  fetch("Gestionador?accion=completar&id=" + id);

                        // Programar el salto
                        btnSiguiente.onclick = () => {
                            window.location.href = "Gestionador?accion=siguiente&id=" + id;
                        };*/
                        // EL ESQUEMA DEL ALUMNO
                        const jsonEsquema = this.capturarEsquemaActual();

                        // MANDAMOS EL POST AL SERVLET CON LA ACCIÓN Y EL JSON
                        fetch("Gestionador", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded"
                            },
                            body: `submit=GUARDAR_RESPUESTA&id=${id}&jsonGrafico=${encodeURIComponent(jsonEsquema)}`
                        })
                        .then(response => {
                            if (!response.ok) {
                                console.error("Error al persistir el JSON en la base de datos.");
                            }
                        })
                        .catch(err => console.error("Error de red guardando respuesta:", err));

                        // Programar el salto del botón siguiente
                        btnSiguiente.onclick = () => {
                            window.location.href = "Gestionador?accion=siguiente&id=" + id;
                        };
                    
                    }
                }
            }
        });
    }
}
  
 
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
  
 /* capturarEsquemaActual() {
    const backup = {
      relations: this.#schema.relations.map(r => ({
        name: r.name,
        attributes: r.attributes.map(a => ({ name: a.name, isPK: a.isPK })),
        fks: r.fks.map(fk => ({
          targetRelation: fk.targetRelation.name,
          attributes: fk.attributes.map(a => a.name)
        }))
      }))
    };
    return JSON.stringify(backup);
  }*/
capturarEsquemaActual() {
    const backup = {
      relations: this.#schema.relations.map(r => ({
        name: r.name,
        attributes: r.attributes.map(a => {
            // === CONTROL SEGURO DE CAPTURA DE PK ===
            // Como tu clase maneja de forma opaca la PK, la leemos directo de las clases del elemento HTML
            let tienePK = false;
            if (a.element) {
                // Evaluamos si el elemento del atributo o su botón de clave contiene la clase activa de la PK
                tienePK = a.element.classList.contains('isPK') || 
                          a.element.classList.contains('pk') ||
                          a.element.querySelector('.isPK') !== null ||
                          a.element.querySelector('.pk.selected') !== null ||
                          a.element.querySelector('.pkButton.selected') !== null;
            }
            
            return { 
                name: a.name, 
                isPK: tienePK 
            };
        }),
        fks: r.fks.map(fk => ({
          targetRelation: fk.targetRelation.name,
          attributes: fk.attributes.map(a => a.name)
        }))
      }))
    };
    return JSON.stringify(backup);
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

