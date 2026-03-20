import {Attribute} from "./attribute.js"
import {FK} from "./fk.js"


class Relation {
    #name
    #fks
    #fksReferencing
    #attributes
    #element
    #schema
    #selected
    #multiAttrSelected
    
    constructor (name, schema) {
        this.#name = name
        this.#fks = []
        this.#fksReferencing = []
        this.#attributes = []     
        this.createElement()   
        this.#schema = schema
        this.#selected = false
        this.#multiAttrSelected = false 
    }

    get multiAttrSelected () {
        return this.#multiAttrSelected
    }

    get schema () {
        return this.#schema
    }
    
    get name() {
        return this.#name
    }

    get element() {
        return this.#element
    }

    get attributes(){
        return this.#attributes
    }

    get fks(){
        return this.#fks
    }

    disableFKs () {
        for(const f of this.#fks) f.disable()
    }

    toggleSelectedFKs (fk) {
        for(const f of this.#fks){
            if(f == fk) f.toggleSelected()
            else f.disable()
        }
    }
    
    disableAttributes () {
        this.destroyAttributeGroupActions()
        for(const a of this.#attributes) a.disable()
    }

    toggleSelectedAttributes (attribute) {
        // gestionar todos los cambios de estado
        attribute.toggleSelected()
        const selectedAttrs = this.#attributes.filter((a) => a.selected)
        if (selectedAttrs.length > 1){
            for(const a of this.#attributes) a.destroyActions()
            this.showAttributeGroupActions()
        } 
        else if (selectedAttrs.length == 1){
            selectedAttrs[0].showActions()
            this.destroyAttributeGroupActions()
        }
        /*const amount = attribute.selected ? selectedAttrs.length : selectedAttrs.length + 1
        if (attribute.selected && selectedAttrs.length > 1){
            for(const a of this.#attributes){
                if ()
            }
        }
        
        
        this.#multiAttrSelected = amount > 1
        */
        
    }

    attributeGroup () {
        return this.#attributes.filter((a) => a.selected).length > 1
    }

    disable () {
        this.#selected = false
        this.#element.classList.remove('selected')
        this.destroyActions()
    }

    toggleSelected () {
        if (!this.#selected) this.showActions()
        else this.destroyActions()
        this.#element.classList.toggle('selected')
        this.#selected = !this.#selected
    }

    #getNewAttrName () {
        const base = this.#name
        let i = 1
        while(this.#attributes.find((a) => a.name === base + i) != null){
            i++
        }
        return base + i
    }

    createFK (attrs, targetRelation) {
        const fk = new FK(this, targetRelation, attrs)
        this.#fks.push(fk)
        this.#element.querySelector('.fk_list').appendChild(fk.element)
        /*const fkEl = document.createElement('div')
        fkEl.classList.add('fk')
        const parentX = originRelEl.getBoundingClientRect().x
        const attrPos = originAttrs.map((a) => a.getBoundingClientRect())
        const minX = attrPos.map((p) => p.left).reduce((m,x) => {
            if(m==null || x<m) return x
            return m
        },null)
        const maxX = attrPos.map((p) => p.right).reduce((m,x) => {
            if(m==null || x>m) return x
            return m
        },null)
        fkEl.style.width = (maxX-minX)+'px'
        fkEl.style.left = `calc(${minX-parentX}px - 0.5em)`
        fkEl.dataset.origin = 'B'
        fkEl.dataset.dest = 'A'
        fkEl.dataset.attributes = 'B1;B2'

        if(originAttrs.length > 1){
            const marker = document.createElement('div')
            marker.classList.add('fk_marker')  
            fkEl.appendChild(marker)
        } 
        
        const fkText = document.createElement('div')
        fkText.classList.add('fk_text')
        fkText.innerText = `FK:A`
        fkEl.appendChild(fkText)

        originRelEl.querySelector('.fk_list').appendChild(fkEl)

        manageFKActions(fkEl)*/
    }

    onDeleteClick = () => {
        this.destroyActions()
        this.#schema.removeRelation(this)
    }

    onEditClick = () => {
        const relNameEl = this.#element.querySelector('.relationName')
        relNameEl.toggleAttribute('contenteditable')
        this.#element.classList.remove('selected')
        this.destroyActions()
        relNameEl.focus()
    }

    createAttribute () {
        const name = this.#getNewAttrName()
        const attribute = new Attribute(name, this)
        this.#attributes.push(attribute)
        const insertionPoint = this.#element.querySelector('.newAttribute')
        insertionPoint.parentNode.insertBefore(attribute.element,insertionPoint)
    }

    createElement () {
        const template = document.querySelector('#relation_template')
        const element = template.content.cloneNode(true).querySelector('.relation')
        element.querySelector('.relationName').innerText = this.#name
        this.#element = element
        this.manageNewAttributeClick()
        this.manageClick()
        this.manageEdit()
    }

    manageEdit () {
        const onEdit = (mutation) => {
            const newValue = this.#element.querySelector('.relationName').innerText.trim()
            this.#name = newValue
        }
        const observer = new MutationObserver(onEdit)
        const config = { characterDataOldValue : true, characterData: true, subtree: true }
        observer.observe(this.#element.querySelector('.relationName'), config)
    }

    manageNewAttributeClick () {
        this.#element.querySelector('.newAttribute').addEventListener('click',(e) => {
            this.createAttribute()
            e.stopPropagation()
            e.preventDefault()
        })
    }

    manageClick () {
        this.#element.querySelector('.relationName').addEventListener('click',(e) => {
            if (this.#schema.selectingFKTarget){
                this.#schema.finishFKCreation(this)
                e.preventDefault()
                e.stopPropagation()
                return
            }
            if (this.#element.querySelector('.relationName').hasAttribute('contenteditable')){
                e.stopPropagation()
                e.preventDefault()
                return
            }
            this.#schema.onClickRelationSelect(this)
            e.preventDefault()
            e.stopPropagation()
        })
    }

    showActions () {
        const cont = this.#element.querySelector('.relationActionsContainer')
        if (cont != null) return
        const template = document.querySelector('#relation_actions_template')
        const relActionContainer = template.content.cloneNode(true).querySelector('.relationActionsContainer')
        relActionContainer.querySelector('.editAction').addEventListener('click',(e) => {
            this.onEditClick()
            e.stopPropagation()
            e.preventDefault()
        })
        relActionContainer.querySelector('.deleteAction').addEventListener('click',(e) => {
            this.onDeleteClick()
            e.stopPropagation()
            e.preventDefault()
        })
        const pos = this.#element.querySelector('.relationName').getBoundingClientRect()
        this.#element.appendChild(relActionContainer)
        relActionContainer.style.top = `calc(${pos.top}px)`
        relActionContainer.style.left = `calc(${pos.right}px + 1em)`
    }

    destroyActions () {
        const cont = this.#element.querySelector('.relationActionsContainer')
        if(cont != null) cont.parentNode.removeChild(cont)
    }

    onGroupPKClick () {
        const selectedAttrs = this.#attributes.filter((a) => a.selected)
        for(const a of selectedAttrs) a.toggleIsPK()
        this.disableAttributes()
    }

    onGroupFKClick () {
        const selectedAttrs = this.#attributes.filter((a) => a.selected)
        this.#schema.enableFKCreation(selectedAttrs)
        this.disableAttributes()
    }
    
    destroyAttributeGroupActions () {
        const cont = this.#element.querySelector('.groupActions')
        if(cont != null) cont.parentNode.removeChild(cont)
    }

    showAttributeGroupActions () {
        const template = document.querySelector('#attribute_actions_template')
        const clone = template.content.cloneNode(true)
        const bottomAttrActionContainer = clone.querySelector('.bottom_actions')
        bottomAttrActionContainer.classList.add('groupActions')
        bottomAttrActionContainer.querySelector('.pkAction').addEventListener('click',(e) => {
            this.onGroupPKClick()
            e.preventDefault()
            e.stopPropagation()
        })
        bottomAttrActionContainer.querySelector('.fkAction').addEventListener('click',(e) => {
            this.onGroupFKClick()
            e.stopPropagation()
            e.preventDefault()
        })
        const selectedAttrsPos = this.#attributes.filter((a) => a.selected).map((a) => a.element.getBoundingClientRect())

        const minX = selectedAttrsPos.map((p) => p.left).reduce((m,v) => {
            if (m==null || v<m) return v
            return m
        })
        const maxX = selectedAttrsPos.map((p) => p.right).reduce((m,v) => {
            if (m==null || v>m) return v
            return m
        })

        this.#element.appendChild(bottomAttrActionContainer)
        const bottomContPos = bottomAttrActionContainer.getBoundingClientRect()
        bottomAttrActionContainer.style.top = `calc(${selectedAttrsPos[0].bottom}px)`
        bottomAttrActionContainer.style.left = `calc(${minX+((maxX-minX)/2)}px - ${bottomContPos.width/2}px)`
    }

    removeAttribute (attribute) {
        const pos = this.#attributes.indexOf(attribute)
        if (pos !== -1) this.#attributes.splice(pos,1)
        attribute.element.parentNode.removeChild(attribute.element)
    }

    removeFK (fk) {
        const pos = this.#fks.indexOf(fk)
        if (pos !== -1) this.#fks.splice(pos,1)
        fk.element.parentNode.removeChild(fk.element)

    }

}

export {Relation}