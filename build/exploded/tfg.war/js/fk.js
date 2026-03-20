
class FK {
    #originRelation
    #targetRelation
    #attributes
    #element
    #selected
    constructor (originRelation, targetRelation, attributes){
        this.#originRelation = originRelation
        this.#targetRelation = targetRelation
        this.#attributes = attributes
        this.#selected = false
        this.createElement()
    }

    get targetRelation (){
        return this.#targetRelation
    }

    get attributes () {
        return this.#attributes
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

    showActions () {
        const template = document.querySelector('#fk_actions_template')
        const fkActionContainer = template.content.cloneNode(true).querySelector('.fkActionsContainer')

        fkActionContainer.querySelector('.deleteAction').addEventListener('click',(e) => {
            this.onDeleteClick()
            e.stopPropagation()
            e.preventDefault()
        })
        const pos = this.#element.getBoundingClientRect()
        this.#element.appendChild(fkActionContainer)
        fkActionContainer.style.top = `calc(${pos.top}px)`
        fkActionContainer.style.left = `calc(${pos.right}px + 1em)`
    }

    onDeleteClick () {
        this.destroyActions()
        this.#originRelation.removeFK(this)
    }

    destroyActions () {
        const cont = this.#element.querySelector('.fkActionsContainer')
        if(cont != null) cont.parentNode.removeChild(cont)
    }

    get element () {
        return this.#element
    }

    get originRelation () {
        return this.#originRelation
    }

    reposition () {
        const parentX = this.#originRelation.element.getBoundingClientRect().x
        const attrPos = this.#attributes.map((a) => a.element.getBoundingClientRect())
        const minX = attrPos.map((p) => p.left).reduce((m,x) => {
            if(m==null || x<m) return x
            return m
        },null)
        const maxX = attrPos.map((p) => p.right).reduce((m,x) => {
            if(m==null || x>m) return x
            return m
        },null)
        this.#element.style.width = (maxX-minX)+'px'
        this.#element.style.left = `calc(${minX-parentX}px - 0.5em)`
    }

    createElement (){
        const template = document.querySelector('#fk_template')
        const fkEl = template.content.cloneNode(true).querySelector('.fk')
        if(this.#attributes.length > 1){
            fkEl.classList.add('multiple_attributes')
        } 
        fkEl.querySelector('.fk_text').innerText = `FK:${this.#targetRelation.name}`
        this.#element = fkEl
        this.reposition()
        this.manageClick()
    }

    manageClick () {
        this.#element.addEventListener('click',(e) => {
            this.#originRelation.schema.onClickFKSelect(this)
            e.preventDefault()
            e.stopPropagation()
        })
    }
}

export {FK}