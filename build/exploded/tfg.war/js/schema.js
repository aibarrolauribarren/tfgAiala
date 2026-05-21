import {Relation} from "./relation.js"

class Schema {
    #relations
    #editor
    #selectingFKTarget
    #fkAttrs
    constructor (editor) {
        this.#relations = []
        this.#editor = editor
        this.#selectingFKTarget = false
    }

    get relations () {
        return this.#relations
    }

    get selectingFKTarget () {
        return this.#selectingFKTarget
    }

    get fkAttrs () {
        return this.#fkAttrs
    }

    enableFKCreation (attrs) {
        this.#selectingFKTarget = true
        this.#fkAttrs = attrs
        document.body.classList.add('creatingFK')
    }

    finishFKCreation (relation) {
        this.#fkAttrs[0].relation.createFK(this.#fkAttrs, relation)
        this.#selectingFKTarget = false
        this.#fkAttrs = []
        document.body.classList.remove('creatingFK')
    }

    cancelFKCreation () {
        this.#selectingFKTarget = false
        this.#fkAttrs = []
        document.body.classList.remove('creatingFK')
    }

    get editor () {
        return this.#editor
    }

    #getNewRelationName () {
        const base = 'NuevaRelacion'
        if (this.#relations.find((r) => r.name === base) == null) return base
        let i = 2
        while(this.#relations.find((r) => r.name === base + i) != null){
            i++
        }
        return base + i
    }

    createRelation () {
        const name = this.#getNewRelationName()
        const relation = new Relation(name, this)
        this.#relations.push(relation)
        const cont = document.querySelector('#schemaContainer')
        cont.appendChild(relation.element)
    }
    
   /* createRelationFromData (relationData) {
        // 1. Creamos la relación (la tabla) con su nombre real
        const relation = new Relation(relationData.name, this);
        this.#relations.push(relation);
        
        const cont = document.querySelector('#schemaContainer');
        if (cont) cont.appendChild(relation.element);

        // === LIMPIEZA CRÍTICA ===
        // Si tu clase Relation crea automáticamente atributos genéricos (como A1, A2, A3, A4, A5),
        // tenemos que borrarlos del array y del HTML para que no se dupliquen con los reales.
        if (relation.attributes && relation.attributes.length > 0) {
            // Si tienes un método para borrar atributos en relation.js úsalo aquí.
            // Si no, vaciamos el contenedor visual y el array interno:
            const attrsContainer = relation.element.querySelector('.attributesContainer') || relation.element;
            if (attrsContainer) {
                // Conservamos solo los botones interactivos si los hay, o limpiamos los textos de atributos viejos
                // Dependiendo de tu HTML, esto limpia los elementos hijos que representen atributos por defecto.
                // relation.attributes = []; 
            }
        }

        // 2. Inyectamos los atributos REALES guardados en tu respuesta de la base de datos
        if (relationData.attributes && Array.isArray(relationData.attributes)) {
            relationData.attributes.forEach(attrData => {
                if (typeof relation.createAttribute === 'function') {
                    // Creamos el atributo con su nombre real (ej: "A1", "A6", "A7")
                    const nuevoAtributo = relation.createAttribute(attrData.name);
                    
                    // 3. Forzamos el estado de la Primary Key (Subrayado / Llave dorada)
                    if (attrData.isPK === true && nuevoAtributo) {
                        // Intentamos llamar a las funciones internas de tu clase Attribute
                        if (typeof nuevoAtributo.togglePK === 'function') {
                            nuevoAtributo.togglePK(true);
                        } else if (typeof nuevoAtributo.setPK === 'function') {
                            nuevoAtributo.setPK(true);
                        } else {
                            // Si no hay funciones mapeadas, forzamos la propiedad y añadimos la clase visual CSS
                            nuevoAtributo.isPK = true;
                            // Buscamos el elemento HTML del atributo o su botón de PK
                            const btn = nuevoAtributo.element?.querySelector('.pkButton') || nuevoAtributo.element;
                            if (btn) {
                                btn.classList.add('isPK'); // Cambia 'isPK' por la clase CSS exacta que use tu app
                            }
                        }
                    }
                }
            });
        }
        return relation;
    }*/
    createRelationFromData (relationData) {
        const relation = new Relation(relationData.name, this);
        this.#relations.push(relation);
        
        const cont = document.querySelector('#schemaContainer');
        if (cont) cont.appendChild(relation.element);

        // Inyectamos los atributos reales guardados en tu respuesta de la base de datos
        if (relationData.attributes && Array.isArray(relationData.attributes)) {
            relationData.attributes.forEach(attrData => {
                if (typeof relation.createAttribute === 'function') {
                    // Creamos el atributo pasándole su nombre real capturado ("A1", "A6", etc.)
                    const nuevoAtributo = relation.createAttribute(attrData.name);
                    
                    // Si el registro de la BD dice que este atributo era PK, llamamos a tu método real
                    if (attrData.isPK === true && nuevoAtributo) {
                        if (typeof nuevoAtributo.toggleIsPK === 'function') {
                            nuevoAtributo.toggleIsPK(); // Activa la llave primaria usando tus tripas de negocio
                        }
                    }
                }
            });
        }
        return relation;
    }

    // Se encarga de iterar todo el JSON relacional recuperado de la BD
    cargarEsquemaGuardado (esquemaData) {
        if (!esquemaData || !esquemaData.relations) return;

        // Fase 1: Crear todas las tablas y sus atributos primero
        const relacionesCreadas = {};
        esquemaData.relations.forEach(rData => {
            const rel = this.createRelationFromData(rData);
            relacionesCreadas[rData.name] = rel;
        });

        // Fase 2: Recrear las Claves Foráneas (FK) una vez que todas las tablas ya existen en el DOM
        esquemaData.relations.forEach(rData => {
            if (rData.fks && Array.isArray(rData.fks)) {
                rData.fks.forEach(fkData => {
                    const originRelation = relacionesCreadas[rData.name];
                    const targetRelation = relacionesCreadas[fkData.targetRelation];

                    if (originRelation && targetRelation && typeof originRelation.createFK === 'function') {
                        // Buscamos las instancias de los atributos locales que forman la FK
                        const originAttrs = fkData.attributes.map(attrName => 
                            originRelation.attributes.find(a => a.name === attrName)
                        ).filter(Boolean);

                        if (originAttrs.length > 0) {
                            originRelation.createFK(originAttrs, targetRelation);
                        }
                    }
                });
            }
        });
    }

    getRelationByName (name) {
        return this.#relations.find((r) => r.name == name)
    }

    removeRelation (relation) {
        const pos = this.#relations.indexOf(relation)
        if (pos !== -1) this.#relations.splice(pos,1)
        relation.element.parentNode.removeChild(relation.element)
    }

    onClickRelationSelect (relation) {
        for (const r of this.#relations){
            if (r != relation) r.disable()
            else r.toggleSelected()
        }
    }

    onClickAttributeSelect (attribute) {
        for (const r of this.#relations){
            if (r != attribute.relation){
                r.disableAttributes()
            } 
            else {
                // todo
                r.toggleSelectedAttributes(attribute)
            }
        }
    }

    onClickFKSelect (fk) {
        for (const r of this.#relations){
            if (r != fk.originRelation){
                r.disableFKs()
            } 
            else {
                r.toggleSelectedFKs(fk)
            }
        }
    }
    
}

export {Schema}