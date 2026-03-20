let schema = {
  relations: []
}

const showFKActions = () => {

  // todo
  /*
  const selectedFK = document.querySelector('.fk.selected')
  destroyFKActions()
  destroyRelationActions()
  destroyAttributeActions()
  const selFKs = document.querySelectorAll('.fk.selected')
  for(s of selFKs) s.classList.toggle('selected')

  if (selectedFK == null){
    return // destroyRelationActions()
  } 

  const fkActionContainer = document.createElement('div') 
  fkActionContainer.classList.add('fkActionsContainer')
  const deleteButton = document.createElement('div')
  deleteButton.classList.add('actionButton','deleteAction')
  deleteButton.innerText = '❌'
  deleteButton.addEventListener('click',(e) => {
    onDeleteFkClick()
    e.stopPropagation()
    e.preventDefault()
  })
  fkActionContainer.appendChild(deleteButton)
  const pos = selectedFK.querySelector('.relationName').getBoundingClientRect()
  document.body.appendChild(relActionContainer)
  const contPos = relActionContainer.getBoundingClientRect()
  fkActionContainer.style.top = `calc(${pos.top}px)`
  fkActionContainer.style.left = `calc(${pos.right}px + 1em)`
  */
}


const manageFKActions = (fkEl) => {
  fkEl.addEventListener('click',(e) => {
    if (!fkEl.classList.contains('selected')){
      const selectedFKs = document.querySelectorAll('.fk.selected')
      for(r of selectedFKs){
        r.classList.remove('selected')
      }
    }
    fkEl.classList.toggle('selected')
    e.preventDefault()
    e.stopPropagation()
  })

  const config = { attributes: true, childList: false, subtree: false}
  let onFKChange = (mutations) => {
      if (fkEl.classList.contains('selected')){
        showFKActions()
      }
      else {
        destroyFKActions()
      }
  }
  const observer = new MutationObserver(onFKChange)
  observer.observe(fkEl, config)
}

const createFK = (originRelEl, originAttrs, destRelEl) => {
  const fkEl = document.createElement('div')
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

  manageFKActions(fkEl)
}

const addAttrEditObserver = (attrEl) => {
  const onEdit = (mutation) => {
    const relationEl = attrEl.closest('.relation')
    if (relationEl == null) return
    const relNameEl = relationEl.querySelector('.relationName')
    if (relNameEl == null) return
    const relName = relNameEl.innerText.trim()
    const relation = schema.relations.find((r) => r.name == relName)
    if (relation == null) return
    const newValue = attrEl.innerText.trim()
    const oldValue = mutation[0].oldValue.trim()
    const attr = relation.attributes.find((a) => a.name === oldValue)
    if (attr == null) return
    attr.name = newValue
  }
  const observer = new MutationObserver(onEdit)
  const config = { characterDataOldValue : true, characterData: true, subtree: true }
  observer.observe(attrEl, config)
}

const addRelEditObserver = (relEl) => {
  const onEdit = (mutation) => {
    const newValue = relEl.innerText.trim()
    const oldValue = mutation[0].oldValue.trim()
    const relation = schema.relations.find((r) => r.name === oldValue)
    if (relation == null) return
    relation.name = newValue
  }
  const observer = new MutationObserver(onEdit)
  const config = { characterDataOldValue : true, characterData: true, subtree: true }
  observer.observe(relEl, config)
}

const onEditAttributeClick = () => {
  const selectedAttr = document.querySelector('.attribute.selected')
  selectedAttr.toggleAttribute('contenteditable')
  selectedAttr.classList.remove('selected')
  destroyAttributeActions()
  selectedAttr.focus()
}

const onDeleteAttributeClick = () => {
    const selectedAttr = document.querySelector('.attribute.selected')
    const relationEl = selectedAttr.closest('.relation')
    if (relationEl == null) return
    const relNameEl = relationEl.querySelector('.relationName')
    if (relNameEl == null) return
    const relName = relNameEl.innerText.trim()
    const relation = schema.relations.find((r) => r.name == relName)
    if (relation == null) return 
    const attrName = selectedAttr.innerText.trim()
    const attributePos = relation.attributes.findIndex((a) => a.name === attrName)
    if (attributePos == -1) return
    relation.attributes.splice(attributePos,1)
    selectedAttr.parentNode.removeChild(selectedAttr)
    destroyAttributeActions()
}

const onDeleteRelationClick = () => {
  const selectedRel = document.querySelector('.relation.selected')
  if(selectedRel == null) return
  const relName = selectedRel.innerText.trim()
  const relPos = schema.relations.find((r) => {r.name === relName})
  if (relPos == -1) return
  schema.relations.splice(relPos,1)
  selectedRel.parentNode.removeChild(selectedRel)
  destroyRelationActions()
}

const onEditRelationClick = () => {
  const selectedRel = document.querySelector('.relation.selected .relationName')
  selectedRel.toggleAttribute('contenteditable')
  selectedRel.parentNode.classList.remove('selected')
  destroyRelationActions()
  selectedRel.focus()
}

const onPKAttributeClick = () => {
  // todo
  const selectedAttrsNL = document.querySelectorAll('.attribute.selected')
  const selectedAttrs = [...selectedAttrsNL]
  const relationEl = selectedAttrs[0].closest('.relation')
  if (relationEl == null) return
  const relNameEl = relationEl.querySelector('.relationName')
  if (relNameEl == null) return
  const relName = relNameEl.innerText.trim()
  const relation = schema.relations.find((r) => r.name == relName)
  if (relation == null) return 
  for (at of selectedAttrs){ 
    at.classList.toggle('pk')
  }
  destroyAttributeActions()
}

const showRelationActions = () => {
  const selectedRelation = document.querySelector('.relation.selected')
  destroyRelationActions()
  destroyAttributeActions()
  const selAttrs = document.querySelectorAll('.attribute.selected')
  for(s of selAttrs) s.classList.toggle('selected')

  if (selectedRelation == null){
    // incorrect call
    return // destroyRelationActions()
  } 

  const relActionContainer = document.createElement('div') 
  relActionContainer.classList.add('relationActionsContainer')
  const editButton = document.createElement('div')
  editButton.classList.add('actionButton','editIcon')
  editButton.innerText = '✏️'
  editButton.addEventListener('click',(e) => {
    onEditRelationClick()
    e.stopPropagation()
    e.preventDefault()
  })
  const deleteButton = document.createElement('div')
  deleteButton.classList.add('actionButton','deleteAction')
  deleteButton.innerText = '❌'
  deleteButton.addEventListener('click',(e) => {
    onDeleteRelationClick()
    e.stopPropagation()
    e.preventDefault()
  })
  relActionContainer.appendChild(editButton)
  relActionContainer.appendChild(deleteButton)
  const pos = selectedRelation.querySelector('.relationName').getBoundingClientRect()
  document.body.appendChild(relActionContainer)
  const contPos = relActionContainer.getBoundingClientRect()
  relActionContainer.style.top = `calc(${pos.top}px)`
  relActionContainer.style.left = `calc(${pos.right}px + 1em)`
}

const showAttributeActions = () => {
  const selectedAttrsNL = document.querySelectorAll('.attribute.selected')
  const selectedAttrs = [...selectedAttrsNL]
  destroyAttributeActions()
  destroyRelationActions()
  document.querySelector('.relation.selected')?.classList.toggle('selected')
  if (selectedAttrs.length == 0){
    // incorrect call
    return // destroyAttributeActions()
  } 

  const bottomAttrActionContainer = document.createElement('div') 
  bottomAttrActionContainer.classList.add('attributeActionsContainer')
  const pkButton = document.createElement('div')
  pkButton.classList.add('actionButton','pkAction')
  pkButton.innerText = '🗝️'
  pkButton.addEventListener('click',(e) => {
    onPKAttributeClick()
    e.preventDefault()
    e.stopPropagation()
  })
  const fkButton = document.createElement('div')
  fkButton.classList.add('actionButton','fkAction')
  fkButton.innerText = '↩️'
  fkButton.addEventListener('click',(e) => {
    onFKAttributeClick()
    e.stopPropagation()
    e.preventDefault()
  })
  bottomAttrActionContainer.appendChild(pkButton)
  bottomAttrActionContainer.appendChild(fkButton)
  const selectedPositions = selectedAttrs.map((a) => a.getBoundingClientRect())
  const minX = selectedPositions.map((p) => p.left).reduce((m,v) => {
    if (m==null || v<m) return v
    return m
  })
  const maxX = selectedPositions.map((p) => p.right).reduce((m,v) => {
    if (m==null || v>m) return v
    return m
  })
  document.body.appendChild(bottomAttrActionContainer)
  const bottomContPos = bottomAttrActionContainer.getBoundingClientRect()
  bottomAttrActionContainer.style.top = `calc(${selectedPositions[0].bottom}px)`
  bottomAttrActionContainer.style.left = `calc(${minX+((maxX-minX)/2)}px - ${bottomContPos.width/2}px)`

  
  if (selectedAttrs.length == 1) {
    const topAttrActionContainer = document.createElement('div') 
    topAttrActionContainer.classList.add('attributeActionsContainer')
    const editButton = document.createElement('div')
    editButton.classList.add('actionButton','editIcon')
    editButton.innerText = '✏️'
    editButton.addEventListener('click',(e) => {
      onEditAttributeClick()
      e.stopPropagation()
      e.preventDefault()
    })
    const deleteButton = document.createElement('div')
    deleteButton.classList.add('actionButton','deleteAction')
    deleteButton.innerText = '❌'
    deleteButton.addEventListener('click',(e) => {
      onDeleteAttributeClick()
      e.stopPropagation()
      e.preventDefault()
    })
    topAttrActionContainer.appendChild(editButton)
    topAttrActionContainer.appendChild(deleteButton)
    const attrEl = selectedAttrs[0]
    const pos = attrEl.getBoundingClientRect()
    document.body.appendChild(topAttrActionContainer)
    const contPos = topAttrActionContainer.getBoundingClientRect()
    topAttrActionContainer.style.top = `calc(${pos.top}px - ${contPos.height}px)`
    topAttrActionContainer.style.left = `calc(${pos.left+((pos.right-pos.left)/2)}px - ${contPos.width/2}px)`
  } 


}

const destroyFKActions = () => {
  const fkActionConts = document.querySelectorAll('.fkActionsContainer')
  for (c of fkActionConts){
    c.parentNode.removeChild(c)
  }
}

const destroyRelationActions = () => {
  const relActionConts = document.querySelectorAll('.relationActionsContainer')
  for (c of relActionConts){
    c.parentNode.removeChild(c)
  }
}

const destroyAttributeActions = () => {
  const attrActionConts = document.querySelectorAll('.attributeActionsContainer')
  for (c of attrActionConts){
    c.parentNode.removeChild(c)
  }
}

const manageAttributeActions = (attrEl) => {
  attrEl.addEventListener('click',(e) => {
    if (attrEl.hasAttribute('contenteditable')){
      e.stopPropagation()
      e.preventDefault()
      return
    }
    // todo -> disable other selected attributes in other relationships
    attrEl.classList.toggle('selected')
    e.stopPropagation()
    e.preventDefault()
  })

  const config = { attributes: true, childList: false, subtree: false}
  let onAttrChange = (mutations) => {
    
      //if (attrEl.classList.contains('selected')){
        showAttributeActions()
      //}
      //else {
      //  destroyAttributeActions()
      //}
  }
  const observer = new MutationObserver(onAttrChange)
  observer.observe(attrEl, config)
}

const manageRelationActions = (relEl) => {
  relEl.querySelector('.relationName').addEventListener('click',(e) => {
    if (relEl.querySelector('.relationName').hasAttribute('contenteditable')){
      e.stopPropagation()
      e.preventDefault()
      return
    }
    if (!relEl.classList.contains('selected')){
      const selectedRels = document.querySelectorAll('.relation.selected')
      for(r of selectedRels){
        r.classList.remove('selected')
      }
    }
    relEl.classList.toggle('selected')
    e.preventDefault()
    e.stopPropagation()
  })

  const config = { attributes: true, childList: false, subtree: false}
  let onRelChange = (mutations) => {
      if (relEl.classList.contains('selected')){
        showRelationActions()
      }
      else {
        destroyRelationActions()
      }
  }
  const observer = new MutationObserver(onRelChange)
  observer.observe(relEl, config)

}

const createAttribute = (target) => {
  const relEl = target.closest('.relation')
  if (relEl == null) return
  const relNameEl = relEl.querySelector('.relationName')
  const relName = relNameEl?.innerText
  if (relName == null) return
  const rel = schema.relations.find((r) => r.name == relName)
  if (rel == null) return
  const attrName = getNewAttrName(rel)
  rel.attributes.push({name: attrName})
  const attrEl = document.createElement('div')
  attrEl.setAttribute('draggable',true)
  attrEl.innerText = attrName
  attrEl.classList.add('attribute')
  target.parentNode.insertBefore(attrEl,target)
  manageAttributeActions(attrEl)
  addAttrEditObserver(attrEl)
  //manageAttributeDrag(attrEl)
}

/*
const manageAttributeDrag = (attrEl) => {
  attrEl.addEventListener('dragstart', (e) => {
    const data = {
      relation: attrEl.closest('.relation').querySelector('.relationName').innerText.trim(),
      attribute: attrEl.innerText.trim()
    }
    e.dataTransfer.setData('text',JSON.stringify(data))
  })
}*/

const getNewAttrName = (relation) => {
  const base = relation.name
  let i = 1
  while(relation.attributes.find((a) => a.name === base + i) != null){
    i++
  }
  return base + i
}

const getNewRelationName = () => {
  const base = 'NuevaRelacion'
  if (schema.relations.find((r) => r.name === base) == null) return base
  let i = 2
  while(schema.relations.find((r) => r.name === base + i) != null){
    i++
  }
  return base + i
}

const createRelation = () => {
  const name = getNewRelationName()
  const relation = {name: name, attributes: []}
  schema.relations.push(relation)
  const relEl = document.createElement('div')
  relEl.classList.add('relation')
  const relName = document.createElement('div')
  relName.classList.add('relationName')
  //relName.setAttribute('contenteditable',true)
  relName.innerText = name
  const relStr = document.createElement('div')
  relStr.classList.add('relationStructure')
  /*relStr.addEventListener('drop',(e) => {
    const relName = relName.innerText.trim()
    const dropedData = JSON.parse(e.dataTransfer.getData('text'))
    if (relName )
    console.log('drop')
  })
  relStr.addEventListener('dragover',(e) => {
    e.preventDefault()
  })*/
  const newAttrBtn = document.createElement('div')
  newAttrBtn.classList.add('newAttribute')
  newAttrBtn.classList.add('clickable')
  newAttrBtn.innerText = '+'
  newAttrBtn.addEventListener('click',(e) => {
    createAttribute(e.currentTarget)
    e.stopPropagation()
    e.preventDefault()
  })
  relEl.appendChild(relName)
  relStr.appendChild(newAttrBtn)
  relEl.appendChild(relStr)

  const fkList = document.createElement('div')
  fkList.classList.add('fk_list')
  relEl.appendChild(fkList)

  const cont = document.querySelector('#schemaContainer')
  cont.appendChild(relEl)
  manageRelationActions(relEl)
  addRelEditObserver(relName)
}

const newRelationButton = document.querySelector("#newRelation")
if (newRelationButton != null){
  newRelationButton.addEventListener('click',(e) => {
    createRelation()
  })
}

document.addEventListener('click',() => {
  const editableEls = document.querySelectorAll('div[contenteditable]')
  for (el of editableEls){
    el.removeAttribute('contenteditable')
  }
  const selectedEls = document.querySelectorAll('.selected')
  for (el of selectedEls){
    el.classList.remove('selected')
  }
})

document.querySelector('#testFK').addEventListener('click',(e) => {
  const originRel = document.querySelector('.relation:nth-child(2)')
  const destRel = document.querySelector('.relation:nth-child(1)')
  const attrs = Array.from(originRel.querySelectorAll('.attribute:nth-child(2),.attribute:nth-child(3)'))
  createFK(originRel,attrs,destRel)
})