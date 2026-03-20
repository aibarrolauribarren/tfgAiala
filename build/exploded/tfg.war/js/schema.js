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