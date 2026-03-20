
class Attribute {
    #relation
    #name
    #element
    #group
    #selected
    #isPK

    constructor (name, relation) {
        this.#name = name
        this.#relation = relation
        this.createElement()
        this.#selected = false
        this.#isPK = false
    }

    get isPK () {
        return this.#isPK
    }

    get relation(){
        return this.#relation
    }

    get selected () {
        return this.#selected
    }

    toggleIsPK () {
        this.#isPK = !this.#isPK
        this.#element.classList.toggle('pk')
    }

    disable () {
        this.#element.classList.remove('selected')
        this.destroyActions()
        this.#selected = false
    }

    toggleSelected () {
        if (this.#selected) this.destroyActions()
        this.#element.classList.toggle('selected')
        this.#selected = !this.#selected
    }

    createElement () {
        const template = document.querySelector('#attribute_template')
        const attributeEl = template.content.cloneNode(true).querySelector('.attribute')
        attributeEl.querySelector('.attributeName').innerText = this.#name
        this.#element = attributeEl
        this.manageEdit()
        this.manageClick()
    }

    get element () {
        return this.#element
    }

    get name () {
        return this.#name
    }

    get schema () {
        return this.#relation.schema
    }

    manageClick () {
        this.#element.addEventListener('click',(e) => {
            if (this.#element.querySelector('.attributeName').hasAttribute('contenteditable')){
                e.stopPropagation()
                e.preventDefault()
                return
            }
            this.schema.onClickAttributeSelect(this)
            e.preventDefault()
            e.stopPropagation()
        })
    }

    manageEdit () {
        const onEdit = (mutation) => {
            const newValue = this.#element.querySelector('.attributeName').innerText.trim()
            this.#name = newValue
        }
        const observer = new MutationObserver(onEdit)
        const config = { characterDataOldValue : true, characterData: true, subtree: true }
        observer.observe(this.#element.querySelector('.attributeName'), config)
    }

    showActions () {
        const template = document.querySelector('#attribute_actions_template')
        const clone = template.content.cloneNode(true)
        const topAttrActionContainer = clone.querySelector('.top_actions')
        const bottomAttrActionContainer = clone.querySelector('.bottom_actions')
        bottomAttrActionContainer.querySelector('.pkAction').addEventListener('click',(e) => {
            this.onPKClick()
            e.preventDefault()
            e.stopPropagation()
        })
        bottomAttrActionContainer.querySelector('.fkAction').addEventListener('click',(e) => {
            this.onFKClick()
            e.stopPropagation()
            e.preventDefault()
        })
        topAttrActionContainer.querySelector('.editAction').addEventListener('click',(e) => {
            this.onEditClick()
            e.preventDefault()
            e.stopPropagation()
        })
        topAttrActionContainer.querySelector('.deleteAction').addEventListener('click',(e) => {
            this.onDeleteClick()
            e.stopPropagation()
            e.preventDefault()
        })

        const pos = this.#element.getBoundingClientRect()
        this.#element.appendChild(bottomAttrActionContainer)
        const bottomContPos = bottomAttrActionContainer.getBoundingClientRect()
        bottomAttrActionContainer.style.top = `calc(${pos.bottom}px)`
        bottomAttrActionContainer.style.left = `calc(${pos.left+((pos.width)/2)}px - ${bottomContPos.width/2}px)`
        
        this.#element.appendChild(topAttrActionContainer)
        const topContPos = topAttrActionContainer.getBoundingClientRect()
        topAttrActionContainer.style.top = `calc(${pos.top}px - ${topContPos.height}px)`
        topAttrActionContainer.style.left = `calc(${pos.left+((pos.width)/2)}px - ${topContPos.width/2}px)`
    }

    destroyActions () {
        const cont = this.#element.querySelectorAll('.attributeActionsContainer')
        for(const c of cont){
            c.parentNode.removeChild(c)
        }
    }

    onDeleteClick () {
        this.destroyActions()
        this.#relation.removeAttribute(this)
    }

    onEditClick () {
        const attrNameEl = this.#element.querySelector('.attributeName')
        attrNameEl.toggleAttribute('contenteditable')
        this.disable()
        attrNameEl.focus()
    }

    onPKClick() {
        this.toggleIsPK()
        this.disable()
    }

    onFKClick () {
        this.relation.schema.enableFKCreation([this])
        this.disable()
    }

    /*manageSelectionChange () {
        const config = { attributes: true, childList: false, subtree: false}
        let onAttrChange = (mutations) => {
            if (this.#element.classList.contains('selected') && !this.#element.classList.contains('group')){
                this.showActions()
            }
            else {
                this.destroyActions()
            }
        }
        const observer = new MutationObserver(onAttrChange)
        observer.observe(this.#element, config)
    }*/
}

export {Attribute}