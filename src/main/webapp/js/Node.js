const dia = joint.dia
const g = joint.g
const shapes = joint.shapes
const util = joint.util
const elementTools = joint.elementTools
const linkTools = joint.linkTools

const addConnectionPoint = (element) => {
  //element.model.prop('partOfGroup', true) // no hace falta, se elimina el link y se crea uno nuevo
  let wasTotal = element.model.prop('isTotal')
  let paper = element.paper
  //let subclass = element.model.prop('subclass')
  //let superclass = element.model.prop('superclass')
  let subclass = element.model.source()
  let superclass = element.model.target()
  //let subView = paper.findView(subclass.model)
  //let superView = paper.findView(superclass.model)
  let subView = subclass
  let superView = superclass
  let subBBox = subView.getBBox()
  let superBBox = superView.getBBox()
  let connectionPoint = new ConnectionPoint({
    isTotal: wasTotal
  })
  let subCX = subBBox.x + subBBox.width/2
  let subCY = subBBox.y + subBBox.height/2
  let superCX = superBBox.x + superBBox.width/2
  let superCY = superBBox.y + superBBox.height/2
  connectionPoint.position(superCX + (subCX - superCX)/2 - 15, superCY + (subCY - superCY)/2 - 15)
  connectionPoint.addTo(paper.model)


  paper.model.removeCells(element.model) // eliminar conexión (simple) original

  let conSubclass2Point = new InheritanceLink({
    source: subclass,
    target: connectionPoint,
    isTotal: false,
    linkType: 'entity2point'
  })
  conSubclass2Point.addTo(paper.model)

  let conPoint2Superclass = new InheritanceLink({
    source: connectionPoint,
    target: superclass,
    isTotal: wasTotal,
    linkType: 'entity2point',
    showSemicircle: false
  })
  conPoint2Superclass.addTo(paper.model)

  connectionPoint.prop('superclassConnections',[conPoint2Superclass.id])
  connectionPoint.prop('subclassConnections',[conSubclass2Point.id])
  // show settings for the connection point
}

const removeConnectionPoint = (element) => {

}

const showSettings = (element) => {
  let container = document.querySelector('#settingsContainer')
  container.classList.add('visible')
  const settingsContent = document.querySelector('#settingsContent')
  settingsContent.innerHTML = ''
  let settingsCont
  let elementPos = element.model.getBBox().topRight();
  let absPos = element.paper.localToClientPoint(elementPos);
  switch (element.model.attributes['type']){
    case 'erd.Entity':
      settingsCont = document.querySelector('#entitySettingsContent').content.cloneNode(true);
      settingsCont.querySelector("#isWeakInput").checked = element.model.prop('isWeak')
      settingsCont.querySelector("#isWeakInput").addEventListener('change', (e) => {element.model.prop('isWeak',e.currentTarget.checked)})
      break
    case 'erd.Attribute':
      settingsCont = document.querySelector('#attributeSettingsContent').content.cloneNode(true);
      settingsCont.querySelector("#isKeyInput").checked = element.model.prop('isKey')
      settingsCont.querySelector("#isKeyInput").addEventListener('change', (e) => {
        element.model.prop('isKey',e.currentTarget.checked)
        if(e.currentTarget.checked){
          document.querySelector("#isPartialKeyInput").disabled = true
          document.querySelector("#isPartialKeyInput").closest('.settings-element').classList.add('disabled')
        }
        else {
          document.querySelector("#isPartialKeyInput").closest('.settings-element').classList.remove('disabled')
          document.querySelector("#isPartialKeyInput").disabled = false
        }
      })
      settingsCont.querySelector("#isPartialKeyInput").checked = element.model.prop('isPartialKey')
      settingsCont.querySelector("#isPartialKeyInput").addEventListener('change', (e) => {
        element.model.prop('isPartialKey',e.currentTarget.checked)
        if(e.currentTarget.checked){
          document.querySelector("#isKeyInput").closest('.settings-element').classList.add('disabled')
          document.querySelector("#isKeyInput").disabled = true
        }
        else {
          document.querySelector("#isKeyInput").closest('.settings-element').classList.remove('disabled')
          document.querySelector("#isKeyInput").disabled = false
        }
      })
      settingsCont.querySelector("#isMultivaluatedInput").checked = element.model.prop('isMultivaluated')
      settingsCont.querySelector("#isMultivaluatedInput").addEventListener('change', (e) => {element.model.prop('isMultivaluated',e.currentTarget.checked)})
      settingsCont.querySelector("#isDerivatedInput").checked = element.model.prop('isDerivated')
      settingsCont.querySelector("#isDerivatedInput").addEventListener('change', (e) => {element.model.prop('isDerivated',e.currentTarget.checked)})
      break
    case 'erd.Relation':
      settingsCont = document.querySelector('#relationSettingsContent').content.cloneNode(true);
      settingsCont.querySelector("#isIndentifierInput").checked = element.model.prop('isIdentifier')
      settingsCont.querySelector("#isIndentifierInput").addEventListener('change', (e) => {element.model.prop('isIdentifier',e.currentTarget.checked)})
      settingsCont.querySelector('#showRoleInput').checked = element.model.prop('showRoles')
      settingsCont.querySelector('#showRoleInput').addEventListener('change', (e) => {element.model.setShowRoles(e.currentTarget.checked)})
      break
    case 'erd.InheritanceLink':
      // TODO si está agrupado, settings generales de grupo
      settingsCont = document.querySelector('#inheritanceLinkSettingsContent').content.cloneNode(true);
      settingsCont.querySelector("#isTotalInheritance").checked = element.model.prop('isTotal')
      settingsCont.querySelector("#isTotalInheritance").addEventListener('change', (e) => {element.model.prop('isTotal',e.currentTarget.checked)})
      if(!element.model.prop('partOfGroup')){ // todo -> no hace falta
        settingsCont.querySelector('#addConnectionPoint').checked = false
        settingsCont.querySelector('#addConnectionPoint').addEventListener('change', (e) => {
          addConnectionPoint(element)
        })
      }
      break
    case 'erd.ConnectionPoint':
      settingsCont = document.querySelector('#inheritanceLinkSettingsContent').content.cloneNode(true);
      settingsCont.querySelector("#isTotalInheritance").checked = element.model.prop('isTotal')
      settingsCont.querySelector("#isTotalInheritance").addEventListener('change', (e) => {element.model.prop('isTotal',e.currentTarget.checked)})
      if(element.model.prop('partOfGroup')){ // todo -> no hace falta
        settingsCont.querySelector('#addConnectionPoint').checked = true
        settingsCont.querySelector('#addConnectionPoint').addEventListener('change', (e) => {
          removeConnectionPoint(element)
        })
      }
      break
  }
  settingsContent.appendChild(settingsCont);
  container.style.left = (absPos.x+30)+'px'
  container.style.top = (absPos.y-((container.offsetHeight-element.model.getBBox().height)/2))+'px'
}

export const AttributeButton = elementTools.Button.extend({
  name: 'attribute-button',
  options: {
    markup: [
      {
        tagName: 'ellipse',
        selector: 'inner-ellipse',
        attributes: {
          cursor: 'pointer',
          fill: 'white',
          stroke: 'black',
          strokeWidth: '1',
          rx: '10',
          ry: '5'
        }
      },
      {tagName: 'text',
        selector: 'add-button',
        attributes: {
          cursor: 'pointer',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fill: 'black',
          fontSize: 6,
          strokeWidth: 1,
          stroke: 'black',
          x: 0,
          y: 2
        },
        textContent: '➕',
      }],
    x: '50%',
    y: '100%',
    scale: 1.5,
    rotate: true,
    action: function(evt) {
      const at1 = new Attribute()
      at1.position(500, 125);
      at1.addTo(this.paper.model);
      const link = new shapes.standard.Link({
        source: this.model,
        target: at1,
        attrs: {
          line: {
            targetMarker: 'none'
          }
        }
      });
      link.addTo(this.paper.model);

      let linkView = link.findView(this.paper);


      const verticesTool = new linkTools.Vertices();
      const remButton = new linkTools.Remove();
      const linkToolsView = new dia.ToolsView({
        tools: [verticesTool, remButton]
      })
      linkView.addTools(linkToolsView);


      const elementView = at1.findView(this.paper)
      const removeButton = new elementTools.Remove({
        x: 0,
        y: "50%",
        scale: 1.5
      });
      const settingsButton = new SettingsButton();
      const attributeButton = new AttributeButton();
      const linkButton = new LinkButton()
      const toolsView = new dia.ToolsView({
        tools: [
          removeButton,
          settingsButton,
          attributeButton,
          linkButton
        ]
      });
      elementView.addTools(toolsView);
      elementView.hideTools();
    }
  }
});
export const SettingsButton = elementTools.Button.extend({
  name: 'settings-button',
  options: {
    markup: [
      {tagName: 'text',
        selector: 'settings-emoji',
        attributes: {
          cursor: 'pointer',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fill: 'black',
          fontSize: 12,
          y: 5
        },
        textContent: '⚙️',
      }],
    x: '100%',
    y: '50%',
    scale: 1.5,
    rotate: true,
    action: function(evt) {
      showSettings(this)
    }
  }
});
export const LinkButton = elementTools.Button.extend({
  name: 'link-button',
  options: {
    markup: [
      {
        tagName: 'circle',
        selector: 'outer-circle',
        attributes: {
          cursor: 'pointer',
          fill: 'white',
          stroke: 'black',
          strokeWidth: '1',
          r: '8'
        }
      },
      {tagName: 'text',
        selector: 'link-button',
        attributes: {
          cursor: 'pointer',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fill: 'black',
          fontSize: 8,
          strokeWidth: 1,
          stroke: 'black',
          x: 0,
          y: 3
        },
        textContent: '🠀',
      }],
    x: '50%',
    y: '0%',
    scale: 1.5,
    rotate: true,
    action: function(evt, elementView, buttonView) {
      elementView.hideTools();
      let bbox = this.model.getBBox()
      this.paper.model.set('linking',true)
      this.paper.model.set('linkSource',this.el.id)
      let link = document.querySelector('[model-id=connectionLink]')
      let linkEl = this.paper.findView(link)
      linkEl.model.prop('source',this.model.getAbsolutePointFromRelative(bbox.width/2,bbox.height/2))
      // Estas dos líneas no van aquí porque Jointjs no funciona bien en este caso
      //linkEl.model.prop('target',this.model.getAbsolutePointFromRelative(bbox.width/2,0))
      //linkEl.model.attr('line/display',null)
      this.paper.el.dispatchEvent(new MouseEvent("mousedown"))
    }
  }
});
export const DockButton = elementTools.Button.extend({
  name: 'dock-button',
  options: {
    markup: [
      {tagName: 'text',
        selector: 'dock-emoji',
        attributes: {
          cursor: 'pointer',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fill: 'black',
          fontSize: 12,
          y: 5
        },
        textContent: '⚪'
      }],
    x: '100%',
    y: '50%',
    scale: 1.5,
    rotate: false,
    action: function(evt, elementView, buttonView) {
      dockInheritanceLink(elementView)
    }
  }
});
export const UndockButton = elementTools.Button.extend({
  name: 'undock-button',
  options: {
    markup: [
      {tagName: 'image',
        selector: 'settings-emoji',
        attributes: {
          cursor: 'pointer',
          href: 'img/undock.png',
          width: 16,
          height: 16,
          x: -8,
          y: -8
        }
      }],
    x: '100%',
    y: '50%',
    scale: 1.5,
    rotate: false,
    action: function(evt, elementView, buttonView) {
      undockInheritanceLink(elementView)
    }
  }
});
export const InvertButton = elementTools.Button.extend({
  name: 'invert-button',
  options: {
    markup: [
      {tagName: 'text',
        selector: 'invert-emoji',
        attributes: {
          cursor: 'pointer',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fill: 'black',
          fontSize: 12,
          y: 5
        },
        textContent: '️🔄',
      }],
    x: '100%',
    y: '50%',
    scale: 1.5,
    rotate: false,
    action: function(evt, elementView, buttonView) {
      invertInheritanceLink(elementView)
    }
  }
});
export const TotalInheritanceButton = elementTools.Button.extend({
  name: 'total-inheritance-button',
  options: {
    markup: [
      {
        tagName: 'circle',
        selector: 'outer-circle',
        attributes: {
          cursor: 'pointer',
          fill: 'white',
          stroke: 'black',
          strokeWidth: '1',
          r: '8',
          cx: 0,
          cy: 0
        }
      }, {
        tagName: 'path',
        selector: 'button-line2',
        attributes: {
          cursor: 'pointer',
          fill: 'transparent',
          strokeWidth: 2,
          stroke: 'black',
          d: 'M -2 -6 L -2 6'
        }
      },
      {
        tagName: 'path',
        selector: 'button-line1',
        attributes: {
          cursor: 'pointer',
          fill: 'transparent',
          strokeWidth: 2,
          stroke: 'black',
          d: 'M 2 -6 L 2 6'
        }
      }],
    x: '50%',
    y: '0%',
    scale: 1.5,
    rotate: false,
    action: function(evt, elementView, buttonView) {
      convertTotalInheritanceLink(elementView)
    }
  }
});
export const PartialInheritanceButton = elementTools.Button.extend({
  name: 'partial-inheritance-button',
  options: {
    markup: [
      {
        tagName: 'circle',
        selector: 'outer-circle',
        attributes: {
          cursor: 'pointer',
          fill: 'white',
          stroke: 'black',
          strokeWidth: '1',
          r: '8',
          cx: 0,
          cy: 0
        }
      },
      {
        tagName: 'path',
        selector: 'button-line1',
        attributes: {
          cursor: 'pointer',
          fill: 'transparent',
          strokeWidth: 2,
          stroke: 'black',
          d: 'M 0 -6 L 0 6'
        }
      }],
    x: '50%',
    y: '0%',
    scale: 1.5,
    rotate: false,
    action: function(evt, elementView, buttonView) {
      convertPartialInheritanceLink(elementView)
    }
  }
});

const dockInheritanceLink = (elementView) => {
  let wasTotal = elementView.model.prop('isTotal')
  let wasTurned = elementView.model.prop('turned')
  let paper = elementView.paper
  let subclass = wasTurned ? elementView.model.target() : elementView.model.source()
  let superclass = wasTurned ? elementView.model.source() : elementView.model.target()

  let subBBox = subclass.getBBox()
  let superBBox = superclass.getBBox()
  let connectionPoint = new ConnectionPoint({
    isTotal: wasTotal
  })
  let subCX = subBBox.x + subBBox.width/2
  let subCY = subBBox.y + subBBox.height/2
  let superCX = superBBox.x + superBBox.width/2
  let superCY = superBBox.y + superBBox.height/2
  connectionPoint.position(superCX + (subCX - superCX)/2 - 15, superCY + (subCY - superCY)/2 - 15)
  connectionPoint.addTo(paper.model)

  paper.model.removeCells(elementView.model) // eliminar conexión (simple) original

  let conSubclass2Point = new InheritanceLink({
    source: subclass,
    target: connectionPoint,
    isTotal: false,
    linkType: 'connection2subclass',
    connectionType: 'specialization'
  })
  conSubclass2Point.addTo(paper.model)

  let conPoint2Superclass = new InheritanceLink({
    source: superclass,
    target: connectionPoint,
    isTotal: wasTotal,
    linkType: 'connection2superclass',
    connectionType: 'specialization'
  })
  conPoint2Superclass.addTo(paper.model)

  connectionPoint.prop('superclassConnections',[conPoint2Superclass.id])
  connectionPoint.prop('subclassConnections',[conSubclass2Point.id])
  // show settings for the connection point
}

const undockInheritanceLink = (elementView) => {

}

const invertInheritanceLink = (elementView) => {
  if(elementView.model.prop('linkType') == 'entity2entity'){
    elementView.model.prop('turned', !elementView.model.prop('turned'))
  } else {  // todo si está conectado a connection point,
    let conPoint = elementView.model.getConnectionPoint()
    conPoint.invertDirection(elementView.model)
  }
}

const convertTotalInheritanceLink = (elementView) => {
  let connectionPoint = elementView.model.getConnectionPoint()
  connectionPoint.prop('isTotal',true)
}

const convertPartialInheritanceLink = (elementView) => {
  let connectionPoint = elementView.model.getConnectionPoint()
  connectionPoint.prop('isTotal',false)
}

// ENTITIES
const entityMarkup = util.svg/* xml */`
    <rect @selector="entityBody"/>
    <rect @selector="innerEntityBody"/>
    <foreignObject @selector="elementName">
      <div @selector="content" xmlns="http://www.w3.org/1999/xhtml" class="elementNameContainer">
        <div @selector="entityName" class="elementNameInput" contenteditable="true" style="text-transform:uppercase" data-placeholder="ENTIDAD" autocomplete="off" autocorrect="off" spellcheck="false"></div>
      </div>
    </foreignObject>
    <text @selector="elementText" class="elementNameText"/>
`
export class Entity extends dia.Element {
  preinitialize() {
    this.markup = entityMarkup;
  }
  initialize() {
    dia.Element.prototype.initialize.apply(this, arguments)
    let label = this.prop('labelText')
    if(label != null && typeof label === 'object'){
      this.prop('labelText',Object.values(label).join(''))
    }
  }
  defaults() {
    const clipId = util.uuid();

    return {
      ...super.defaults,
      type: 'erd.Entity',
      size: {
        width: 150,
        height: 50
      },
      initialSize: {
        width: 150,
        height: 50,
      },
      isWeak: false,
      labelText: '',
      attrs: {
        root: {
          cursor: 'move'
        },
        entityBody: {
          width: 'calc(w)',
          height: 'calc(h)',
          fill: 'white',
          stroke: 'black',
          strokeWidth: '2'
        },
        innerEntityBody: {
          width: 'calc(w - 10)',
          height: 'calc(h - 10)',
          fill: 'white',
          stroke: 'black',
          strokeWidth: '2',
          x: 5,
          y: 5,
          align: 'middle',
          verticalAlign: 'middle',
          display: 'none'
        },
        elementName: {
          width: 'calc(w - 10)',
          height: 'calc(h - 10)',
          x: 5,
          y: 5
        },
        elementText: {
          width: 'calc(w - 10)',
          height: 'calc(h - 10)',
          display: 'none',
          dominantBaseline: 'middle',
          textAnchor: 'middle',
          x: 'calc(w/2)',
          y: 'calc(h/2)'
        }
      }
    }
  }
}
export class EntityView extends dia.ElementView {
  render() {
    dia.ElementView.prototype.render.apply(this, arguments);
    // label
    this.el.querySelector('.elementNameInput').innerText = this.model.prop('labelText')
    // is weak
    if(this.model.prop('isWeak')) this.model.attr('innerEntityBody/display',null)
    else this.model.attr('innerEntityBody/display', 'none')

    return this
  }
  initialize() {
    dia.ElementView.prototype.initialize.apply(this, arguments);
    this.listenTo(this.model, 'change', (model, options) => {
      if(options.propertyPath == 'size/width' || options.propertyPath == 'labelText') return // avoid re-render as it would lose focus
      this.render()
    })
  }
  manageInput(e) {
    this.model.prop('labelText',e.currentTarget.innerText.trim())
    if(e.currentTarget.innerText.trim() == ''){
      while (e.currentTarget.firstChild) e.currentTarget.removeChild(e.currentTarget.firstChild)
      this.model.prop('size/width',this.model.get('initialSize').width)
    } else{
      this.model.prop('size/width',e.currentTarget.offsetWidth)
    }
  }
  events() {
    return {
      'input .elementNameInput': (e) => {this.manageInput(e)}
    }
  }
}

// ATTRIBUTES
const attributteMarkup = util.svg/* xml */`
    <ellipse @selector="attributeBody"/>
    <ellipse @selector="innerAttributeBody"/>
    <foreignObject @selector="elementName">
      <div @selector="content" xmlns="http://www.w3.org/1999/xhtml" class="elementNameContainer">
        <div @selector="attributeName" class="elementNameInput" contenteditable="true" style="text-transform:capitalize" data-placeholder="atributo" autocomplete="off" autocorrect="off" spellcheck="false"></div>
      </div>
    </foreignObject>
    <text @selector="elementText" class="elementNameText"/>
`
export class Attribute extends dia.Element {
  preinitialize() {
    this.markup = attributteMarkup
  }
  initialize() {
    dia.Element.prototype.initialize.apply(this, arguments)
    let label = this.prop('labelText')
    if(label != null && typeof label === 'object'){
      this.prop('labelText',Object.values(label).join(''))
    }
  }

  defaults() {
    const clipId = util.uuid();

    return {
      ...super.defaults,
      type: 'erd.Attribute',
      size: {
        width: 150,
        height: 50
      },
      initialSize: {
        width: 150,
        height: 50,
      },
      isMultivaluated: false,
      isDerivated: false,
      isKey: false,
      isPartialKey: false,
      labelText: '',
      attrs: {
        root: {
          cursor: 'move'
        },
        attributeBody: {
          width: 'calc(w)',
          height: 'calc(h)',
          fill: 'white',
          stroke: 'black',
          strokeWidth: '2',
          cx: 'calc(w/2)',
          cy: 'calc(h/2)',
          rx: 'calc(w/2)',
          ry: 'calc(h/2)'
        },
        innerAttributeBody: {
          width: 'calc(w-10)',
          height: 'calc(h-10)',
          fill: 'white',
          stroke: 'black',
          strokeWidth: '2',
          cx: 'calc(w/2)',
          cy: 'calc(h/2)',
          rx: 'calc(w/2-5)',
          ry: 'calc(h/2-5)',
          display: 'none'
        },
        elementName: {
          width: 'calc(w - 10)',
          height: 'calc(h - 10)',
          x: 5,
          y: 5
        },
        attributeName: {
          style:{
            textDecorationThickness: '2px'
          }
        },
        elementText: {
          width: 'calc(w - 10)',
          height: 'calc(h - 10)',
          display: 'none',
          textAnchor: 'middle',
          x: 'calc(w/2)',
          y: 'calc(h/2+5)',
          style:{
            textDecorationThickness: '2px'
          }
        }
      }
    }
  }
}
export class AttributeView extends dia.ElementView {
  render() {
    dia.ElementView.prototype.render.apply(this, arguments)
    // label
    this.el.querySelector('.elementNameInput').innerText = this.model.prop('labelText')
    // is multivaluated attribute
    if(this.model.prop('isMultivaluated')) this.model.attr('innerAttributeBody/display',null)
    else this.model.attr('innerAttributeBody/display', 'none')
    // is derivated
    if(this.model.prop('isDerivated')) this.model.attr('attributeBody/strokeDasharray','5,5')
    else this.model.attr('attributeBody/strokeDasharray', null)
    // is (partial) key
    if(this.model.prop('isKey')) {
      this.el.querySelector('.elementNameInput').style.textDecorationLine = 'underline'
      this.model.attr('elementText/textDecoration','underline')
    } else if(this.model.prop('isPartialKey')) { // is partial key
      this.el.querySelector('.elementNameInput').style.textDecorationLine = 'underline'
      this.el.querySelector('.elementNameInput').style.textDecorationStyle = 'dotted'
      this.el.querySelector('.elementNameInput').style.textUnderlineOffset = '2px'
      this.model.attr('elementText/textDecoration','underline dotted')
    } else { // not key
      this.el.querySelector('.elementNameInput').style.textDecorationLine = null
      this.el.querySelector('.elementNameInput').style.textDecorationStyle = null
      this.el.querySelector('.elementNameInput').style.textUnderlineOffset = null
      this.model.attr('elementText/textDecoration',null)
    }
    return this
  }
  initialize() {
    dia.ElementView.prototype.initialize.apply(this, arguments);
    this.listenTo(this.model, 'change', (model, options) => {
      if(options.propertyPath == 'size/width' || options.propertyPath == 'labelText' ) return // avoid re-render as it would lose focus
      this.render()
    })
  }
  manageInput(e){
    this.model.prop('labelText',e.currentTarget.innerText.trim())
    if(e.currentTarget.innerText.trim() == ''){
      while (e.currentTarget.firstChild) e.currentTarget.removeChild(e.currentTarget.firstChild)
      this.model.prop('size/width',this.model.get('initialSize').width)
    } else{
      this.model.prop('size/width',e.currentTarget.offsetWidth)
    }
  }
  events() {
    return {
      'input .elementNameInput': (e) => {this.manageInput(e)}
    }
  }
}

// RELATIONSHIPS
const relationMarkup = util.svg/* xml */`
    <polygon @selector="relationBody"/>
    <polygon @selector="innerRelationBody"/>
    <foreignObject @selector="elementName">
      <div @selector="content" xmlns="http://www.w3.org/1999/xhtml" class="elementNameContainer">
        <div @selector="attributeName" class="elementNameInput" contenteditable="true" style="text-transform:uppercase" data-placeholder="relación" autocomplete="off" autocorrect="off" spellcheck="false"></div>
      </div>
    </foreignObject>
        <text @selector="elementText" class="elementNameText"/>`
export class Relation extends dia.Element {
  preinitialize() {
    this.markup = relationMarkup;
  }
  initialize() {
    dia.Element.prototype.initialize.apply(this, arguments)
    let label = this.prop('labelText')
    if(label != null && typeof label === 'object') this.prop('labelText',Object.values(label).join(''))
  }
  defaults() {
    const clipId = util.uuid();

    return {
      ...super.defaults,
      type: 'erd.Relation',
      size: {
        width: 150,
        height: 50
      },
      isIdentifier: false,
      showRoles: false,
      labelText: '',
      initialSize: {
        width: 150,
        height: 50,
      },
      attrs: {
        root: {
          cursor: 'move'
        },
        relationBody: {
          width: 'calc(w)',
          height: 'calc(h)',
          fill: 'white',
          stroke: 'black',
          strokeWidth: '2',
          points: '0,calc(h/2) calc(w/2),calc(h) calc(w),calc(h/2) calc(w/2),0'
        },
        innerRelationBody: {
          width: 'calc(w)',
          height: 'calc(h)',
          fill: 'white',
          stroke: 'black',
          strokeWidth: '2',
          points: '12,calc(h/2) calc(w/2),calc(h-5) calc(w - 12),calc(h/2) calc(w/2),5',
          display: 'none'
        },
        elementName: {
          width: 'calc(w - 10)',
          height: 'calc(h - 10)',
          x: 5,
          y: 5
        },
        elementText: {
          width: 'calc(w - 10)',
          height: 'calc(h - 10)',
          display: 'none',
          dominantBaseline: 'middle',
          textAnchor: 'middle',
          x: 'calc(w/2)',
          y: 'calc(h/2)'
        }
      }
    }
  }

  setShowRoles(bool) {
    this.prop('showRoles',bool)
    let links = this.graph.getConnectedLinks(this)
    links.forEach((l) => l.prop('showRoles',bool))
  }
}
export class RelationView extends dia.ElementView {
  render() {
    dia.ElementView.prototype.render.apply(this, arguments);
    // label
    this.el.querySelector('.elementNameInput').innerText = this.model.prop('labelText')
    // identifier relationship
    if(this.model.prop('isIdentifier')) this.model.attr('innerRelationBody/display',null)
    else this.model.attr('innerRelationBody/display', 'none')
    return this
  }
  initialize() {
    dia.ElementView.prototype.initialize.apply(this, arguments)
    this.listenTo(this.model, 'change', (model, options) => {
      if(options.propertyPath == 'size/width' || options.propertyPath == 'labelText') return // avoid re-render as it would lose focus
      this.render()
    })
  }
  manageInput(e) {
    this.model.prop('labelText',e.currentTarget.innerText.trim())
    if(e.currentTarget.innerText.trim() == ''){
      while (e.currentTarget.firstChild) e.currentTarget.removeChild(e.currentTarget.firstChild)
      this.model.prop('size/width',this.model.get('initialSize').width)
    } else{
      this.model.prop('size/width',e.currentTarget.offsetWidth)
    }
  }
  events() {
    return {
      'input .elementNameInput': (e) => {this.manageInput(e)}
    }
  }
}

// ATTRIBUTE LINKS
export class AttributeLink extends dia.Link {
  preinitialize() {
    this.markup = shapes.standard.Link.prototype.markup
  }
  defaults() {
    const clipId = util.uuid();

    return {
      ...super.defaults,
      type: 'erd.AttributeLink',
      attrs: {
        line: {
          connection: true,
          stroke: 'black',
          strokeWidth: 2,
          strokeLinejoin: 'round',
          targetMarker: 'none'
        },
        wrapper: {
          connection: true,
          strokeWidth: 10,
          strokeLinejoin: 'round'
        }
      }
    }
  }
}


// RELATIONSHIP LINKS
export class RelationshipLink extends dia.Link {
  preinitialize() {
    this.markup = shapes.standard.Link.prototype.markup
  }
  addCardinalityLabel() {
    const labelMarkup = util.svg/* xml */`
  <foreignObject @selector="linkCardLabel" data-linkId="${this.id}">
    <div @selector="content" xmlns="http://www.w3.org/1999/xhtml" class="linkCardLabelContainer">
      <label @selector="linkLabelOpeningBrackets">(</label>
      <label @selector="linkLabelMinCard" class="linkLabelInput linkCardInput minCard" contenteditable="true" style="text-transform:uppercase" data-placeholder="X" autocomplete="off" autocorrect="off" spellcheck="false">${this.prop('minCard')}</label>
      <label @selector="linkLabelOpeningComa">,</label>
      <label @selector="linkLabelMaxCard" class="linkLabelInput linkCardInput maxCard" contenteditable="true" style="text-transform:uppercase" data-placeholder="X" autocomplete="off" autocorrect="off" spellcheck="false">${this.prop('maxCard')}</label>
      <label @selector="linkLabelClosingBrackets">)</label>
    </div>
  </foreignObject>`
    this.appendLabel({
      markup: labelMarkup,
      attrs: {
        linkCardLabel: {
          width: '6ch',
          height: 30,
          cursor: 'default'
        },
        labelType: 'cardinality'
      },
      position: {
        distance: 0.3,
        offset: 40
      }
    })
  }
  addRoleLabel() {
    const roleLabelMarkup = util.svg/* xml */`
  <foreignObject @selector="roleLabel" data-linkId="${this.id}">
    <div @selector="content" xmlns="http://www.w3.org/1999/xhtml" class="linkRoleLabelContainer">
      <div @selector="linkRoleLabel" class="linkLabelInput linkRoleInput" contenteditable="true" style="text-transform:lowercase" data-placeholder="rol" autocomplete="off" autocorrect="off" spellcheck="false">${this.prop('role')}</div>
    </div>
  </foreignObject>`
    this.appendLabel({
      markup: roleLabelMarkup,
      initialSize: {
        width: '5ch',
        height: 30
      },
      attrs: {
        roleLabel: {
          width: '5ch',
          height: 30,
          cursor: 'default'
        },
        labelType: 'role'
      },
      position: {
        distance: 0.6,
        offset: 30,
        args: {
          keepGradient: true,
          ensureLegibility: true
        }
      }
    })
  }
  initialize() {
    dia.Link.prototype.initialize.apply(this, arguments);
    let minCard = this.prop('minCard')
    if(minCard != null && typeof minCard === 'object') this.prop('minCard',Object.values(minCard).join(''))
    let maxCard = this.prop('maxCard')
    if(maxCard != null && typeof maxCard === 'object') this.prop('maxCard',Object.values(maxCard).join(''))
    let role = this.prop('role')
    if(role != null && typeof role === 'object') this.prop('role',Object.values(role).join(''))
  }
  defaults() {
    const clipId = util.uuid();

    return {
      ...super.defaults,
      type: 'erd.RelationshipLink',
      showRoles: false,
      minCard: '',
      maxCard: '',
      role: '',
      attrs: {
        line: {
          connection: true,
          stroke: 'black',
          strokeWidth: 2,
          strokeLinejoin: 'round',
          targetMarker: 'none'
        },
        wrapper: {
          connection: true,
          strokeWidth: 10,
          strokeLinejoin: 'round'
        }
      }
    }
  }
}
export class RelationshipLinkView extends dia.LinkView {
  render() {
    dia.LinkView.prototype.render.apply(this, arguments)
    this.el.querySelector('.label .minCard').innerText = this.model.prop('minCard')
    this.el.querySelector('.label .maxCard').innerText = this.model.prop('maxCard')
    this.el.querySelector('.label .linkRoleInput').innerText = this.model.prop('role')
    if(!this.model.prop('showRoles')) this.el.querySelector('.linkRoleInput').closest('.label').style.display = 'none'
    else this.el.querySelector('.linkRoleInput').closest('.label').style.display = 'default'
    // todo assign initial width for import
    return this
  }
  initialize() {
    dia.LinkView.prototype.initialize.apply(this, arguments)

    this.listenTo(this.model, 'change', (model, options) => {
      let avoid = ['minCard','maxCard','role']
      if(options.propertyPath == null || (!avoid.includes(options.propertyPath) && !options.propertyPath.includes('labels/'))) this.render()
    })
  }
  manageCardInput(e) {
    let content = e.currentTarget.innerText.trim()
    const card = Number(content)
    if(content == '' || (content != 'N' && content != 'n' && (Number.isNaN(card) || card < 0 || !Number.isInteger(card)))){
      while (e.currentTarget.firstChild) e.currentTarget.removeChild(e.target.firstChild)
    }
    if(e.currentTarget.classList.contains('minCard')) this.model.prop('minCard',e.currentTarget.innerText)
    else if(e.target.classList.contains('maxCard')) this.model.prop('maxCard',e.currentTarget.innerText)
  }
  manageRoleInput(e) {
    let content = e.currentTarget.innerText.trim()
    if(content == ''){
      while (e.currentTarget.firstChild) e.currentTarget.removeChild(e.target.firstChild)
    }
    this.model.prop('role',e.currentTarget.innerText)
    this.model.label(1, {attrs: {roleLabel: {width: e.currentTarget.offsetWidth}}})
  }
  events() {
    return {
      'input .linkCardInput': (e) => {this.manageCardInput(e)},
      'input .linkRoleInput': (e) => {this.manageRoleInput(e)}
    }
  }
}

// INHERITANCE LINKS
const inheritanceLinkMarkup = util.svg/* xml */`
  <path @selector="wraper" fill="none" stroke="transparent" cursor="pointer"/>
  <path @selector="line" fill="none" cursor="pointer"/>
  <path @selector="lineDouble1" fill="none" cursor="pointer"/>
  <path @selector="lineDouble2" fill="none" cursor="pointer"/>
  <path @selector="semicircle" class="semicircle" fill="none" cursor="pointer"/>
`
export class InheritanceLink extends dia.Link {
  preinitialize() {
    this.markup = inheritanceLinkMarkup
  }
  initialize(){
    dia.Link.prototype.initialize.apply(this, arguments)
    if(!this.prop('turned')){
      this.prop('subclass',this.prop('source'))
      this.prop('superclass',this.prop('target'))
    } else{
      this.prop('subclass',this.prop('target'))
      this.prop('superclass',this.prop('source'))
    }
  }
  defaults() {
    const clipId = util.uuid();
    const w = 30
    const h = 30
    return {
      ...super.defaults,
      type: 'erd.InheritanceLink',
      linkType: 'entity2entity', // possible values: entity2entity, connection2superclass, connection2subclass
      dimX: w,
      dimY: h,
      turned: false,
      attrs: {
        line: {
          connection: true,
          stroke: 'black',
          strokeWidth: 2,
          strokeLinejoin: 'round',
          targetMarker: 'none'
        },
        lineDouble1: {
          stroke: 'black',
          strokeWidth: 2,
          strokeLinejoin: 'round',
          targetMarker: 'none',
          display: 'none'
        },
        lineDouble2: {
          stroke: 'black',
          strokeWidth: 2,
          strokeLinejoin: 'round',
          targetMarker: 'none',
          display: 'none'
        },
        wrapper: {
          connection: true,
          strokeWidth: 10,
          strokeLinejoin: 'round'
        },
        semicircle: {
          stroke: 'black',
          strokeWidth: 2,
          d: `M 0 0 C 0 ${h}, ${w} ${h}, ${w} 0`,
          style: {
            transformOrigin: `${w/2}px ${h/2}px`
          }
        }
      }
    }
  }
  getSource(){
    let graph = this.graph
    let source = graph.getCell(this.source().id)
    return source
  }
  getTarget(){
    let graph = this.graph
    let tgt = graph.getCell(this.target().id)
    return tgt
  }
  getConnectionPoint(){
    if (this.prop('linkType') == 'entity2entity') return null
    //if(this.source().prop('type') == 'erd.ConnectionPoint') return this.source() // todo -> comentado para prueba
    if(this.getSource().prop('type') == 'erd.ConnectionPoint') return this.getSource()
    else return this.getTarget()
  }
}
export class InheritanceLinkView extends dia.LinkView {
  render() {
    dia.LinkView.prototype.render.apply(this, arguments)
    let linkType = this.model.prop('linkType')
    let connectionPoint = this.model.getConnectionPoint()
    let connectionType = connectionPoint == null ? 'specialization' : connectionPoint.prop('connectionType')
    if(connectionPoint != null && connectionPoint.prop('isTotal') && ((linkType == 'connection2superclass' && connectionType == 'specialization') ||  (linkType == 'connection2subclass' && connectionType == 'category'))){
      this.model.attr('line/stroke','transparent')
      this.model.attr('lineDouble1/display',null)
      this.model.attr('lineDouble2/display',null)
      let sep = 2
      let offset = 1
      let lx1 = this.sourceBBox.x+this.sourceBBox.width/2
      let ly1 = this.sourceBBox.y+this.sourceBBox.height/2
      let lx2 = this.targetBBox.x+this.targetBBox.width/2
      let ly2 = this.targetBBox.y+this.targetBBox.height/2

      let a = Math.atan((ly2-ly1)/(lx2 - lx1))
      let alpha = (Math.PI/2)-a
      let xa1 = lx1 + sep * Math.cos(alpha)
      let ya1 = ly1 - sep * Math.sin(alpha)
      let xa2 = lx2 + sep * Math.cos(alpha)
      let ya2 = ly2 - sep * Math.sin(alpha)

      let srcRect = null
      if (this.model.getSource() == null || this.model.getSource().prop('type') == 'erd.Entity') srcRect = new g.Rect(this.sourceBBox.x,this.sourceBBox.y,this.sourceBBox.width,this.sourceBBox.height)
      else srcRect = new g.Ellipse(new g.Point(this.sourceBBox.x+this.sourceBBox.width/2,this.sourceBBox.y+this.sourceBBox.height/2),this.sourceBBox.width/2,this.sourceBBox.width/2)

      let tgtRect = null
      if (this.model.getTarget() == null || this.model.getTarget().prop('type') == 'erd.Entity') tgtRect = new g.Rect(this.targetBBox.x,this.targetBBox.y,this.targetBBox.width,this.targetBBox.height)
      else tgtRect = new g.Ellipse(new g.Point(this.targetBBox.x+this.targetBBox.width/2,this.targetBBox.y+this.targetBBox.height/2),this.targetBBox.width/2,this.targetBBox.width/2)

      let l = new g.Line(new g.Point(xa1, ya1), new g.Point(xa2, ya2));
      let srcIntersections1 = srcRect.intersectionWithLine(l)
      let srcIntersections2 = tgtRect.intersectionWithLine(l)

      this.model.attr('lineDouble1/d',`M ${srcIntersections1[0].x},${srcIntersections1[0].y} L ${srcIntersections2[0].x},${srcIntersections2[0].y}`)

      let xb1 = lx1 - sep * Math.cos(alpha)
      let yb1 = ly1 + sep * Math.sin(alpha)
      let xb2 = lx2 - sep * Math.cos(alpha)
      let yb2 = ly2 + sep * Math.sin(alpha)

      let l2 = new g.Line(new g.Point(xb1, yb1), new g.Point(xb2, yb2));
      let tgtIntersections1 = srcRect.intersectionWithLine(l2)
      let tgtIntersections2 = tgtRect.intersectionWithLine(l2)

      this.model.attr('lineDouble2/d',`M ${tgtIntersections1[0].x},${tgtIntersections1[0].y} L ${tgtIntersections2[0].x},${tgtIntersections2[0].y}`)
    }
    else {
      this.model.attr('line/stroke','black')
      this.model.attr('lineDouble1/display','none')
      this.model.attr('lineDouble2/display','none')
    }
    if(linkType == 'entity2entity' || (linkType == 'connection2subclass' && connectionType == 'specialization') || (linkType == 'connection2subclass' && connectionType == 'category')){
      // todo - arreglar parche temporal para el desplazamioento
      this.model.attr('semicircle/display',null)
      let point = this.getPointAtRatio(0.5)
      let tgt = this.getTangentAtRatio(0.5)
      let angle = Math.atan((tgt.end.y-tgt.start.y)/(tgt.end.x-tgt.start.x))
      let deg = angle*180/Math.PI
      if(this.sourcePoint.x <= this.targetPoint.x) deg += 180
      if(this.model.prop('turned')) deg += 180
      this.el.querySelector('.semicircle').style.transform = `translate(${point.x-this.model.prop('dimX')/2}px, ${point.y-this.model.prop('dimY')/2}px) rotate(${-90+deg}deg)`
    } else{
      this.model.attr('semicircle/display','none')
    }
    return this
  }
  initialize() {
    dia.LinkView.prototype.initialize.apply(this, arguments)
    this.listenTo(this.model, 'change', (model, options) => {
      this.render()
      this.manageTools()
    })
    // todo -> comentado para prueba
    //this.listenTo(this.model.source(),'change:position',() => {this.render()})
    //this.listenTo(this.model.target(),'change:position',() => {this.render()})
    this.listenTo(this.model.getSource(),'change:position',() => {this.render()})
    this.listenTo(this.model.getTarget(),'change:position',() => {this.render()})
    this.manageTools()
  }
  manageTools() {
    this.removeTools()
    let tools = []
    let linkType = this.model.prop('linkType')
    let connectionPoint = this.model.getConnectionPoint()
    let connectionContent = connectionPoint == null ? 'specialization' : connectionPoint.prop('connectionType')
    let isTotal = connectionPoint != null ? connectionPoint.prop('isTotal') : false
    if(linkType == 'entity2entity'){
      tools.push(new linkTools.Remove({distance: '25%', scale: 1.5}))
      tools.push(new DockButton({distance: '50%', scale: 1.5}))
      tools.push(new InvertButton({distance: '75%', scale: 1.5}))
    }
    else if(linkType == 'connection2subclass' && connectionContent == 'specialization') {
      tools.push(new linkTools.Remove({distance: '25%', scale: 1.5}))
      //tools.push(new UndockButton({distance: '75%', scale: 1.5}))
      tools.push(new InvertButton({distance: '75%', scale: 1.5}))
    }
    else if(linkType == 'connection2superclass' && connectionContent == 'specialization' && isTotal){
      tools.push(new PartialInheritanceButton({distance: '50%', scale: 1.5}))
    }
    else if(linkType == 'connection2superclass' && connectionContent == 'specialization' && !isTotal){
      tools.push(new TotalInheritanceButton({distance: '50%', scale: 1.5}))
    }
    else if(linkType == 'connection2superclass' && connectionContent == 'category'){
      tools.push(new linkTools.Remove({distance: '25%', scale: 1.5}))
      tools.push(new InvertButton({distance: '75%', scale: 1.5}))
    }
    else if(linkType == 'connection2subclass' && connectionContent == 'category' && isTotal){
      tools.push(new PartialInheritanceButton({distance: '50%', scale: 1.5}))
    }
    else if(linkType == 'connection2subclass' && connectionContent == 'category' && !isTotal){
      tools.push(new TotalInheritanceButton({distance: '50%', scale: 1.5}))
    }
    const toolsView = new dia.ToolsView({tools: tools})
    this.addTools(toolsView)
    toolsView.hide()
    this.hideTools()
  }
}

// CONNECTION POINT
const connectionPointMarkup = util.svg/* xml */`
    <circle @selector="outerCircle"/>
    <foreignObject @selector="connectionTypeLabelObject">
    <div @selector="content" xmlns="http://www.w3.org/1999/xhtml" class="connectionTypeLabelContainer">
      <div @selector="connectionTypeLabel" class="connectionTypeLabelInput" contenteditable="true" style="text-transform:lowercase" data-placeholder="X" autocomplete="off" autocorrect="off" spellcheck="false"></div>
    </div>
  </foreignObject>
    `
export class ConnectionPoint extends dia.Element {
  preinitialize() {
    this.markup = connectionPointMarkup;
  }
  initialize() {
    dia.Element.prototype.initialize.apply(this, arguments)
    let label = this.prop('labelText')
    if(label != null && typeof label === 'object') this.prop('labelText',Object.values(label).join(''))
  }
  defaults() {
    const clipId = util.uuid();

    return {
      ...super.defaults,
      type: 'erd.ConnectionPoint',
      connectionType: 'specialization',
      superclassConnections: [],
      subclassConnections: [],
      isTotal: false,
      size: {
        width: 30,
        height: 30
      },
      labelText: '',
      attrs: {
        root: {
          cursor: 'move'
        },
        outerCircle: {
          r: 'calc(w/2)',
          cx: 'calc(w/2)',
          cy: 'calc(h/2)',
          stroke: 'black',
          strokeWidth: '2',
          fill: 'white'
        },
        connectionTypeLabelObject: {
          width: 'calc(w-10)',
          height: 'calc(h-10)',
          x: 5,
          y: 5
        }
      }
    }
  }
  invertDirection (element) {
    let graph = element.graph
    if(this.prop('connectionType') == 'category'){
      let subclassConnections = this.prop('subclassConnections')
      subclassConnections.forEach((c) => {
        let el = graph.getCell(c)
        if(el!=null) el.prop('linkType', 'connection2superclass')
      })
      let superclassConnections = this.prop('superclassConnections')
      let ind = superclassConnections.findIndex((c) => {
        return c == element.id
      })
      if(ind!=null) superclassConnections.splice(ind,1,subclassConnections[0])
      element.prop('linkType', 'connection2subclass')
      this.prop('superclassConnections',superclassConnections)
      this.prop('subclassConnections',[element.id])
    } else if(this.prop('connectionType') == 'specialization'){
      let subclassConnections = this.prop('subclassConnections')
      let ind = subclassConnections.findIndex((c) => {
        return c == element.id
      })
      subclassConnections.splice(ind,1)
      let superclassConnections = this.prop('superclassConnections')
      superclassConnections.forEach((c) => {
        let el = graph.getCell(c)
        if(el!=null) el.prop('linkType', 'connection2subclass')
      })
      element.prop('linkType','connection2superclass')
      this.prop('subclassConnections',subclassConnections.concat(superclassConnections))
      this.prop('superclassConnections',[element.id])
    }
  }
  setType (type) {
    let graph = this.graph
    let oldType = this.prop('connectionType')
    if(type == oldType) return

    let subclassConnections = this.prop('subclassConnections')
    let superclassConnections = this.prop('superclassConnections')

    subclassConnections.forEach((c) => {
      let el = graph.getCell(c)
      if(el!=null) el.prop('linkType','connection2superclass')
    })
    superclassConnections.forEach((c) => {
      let el = graph.getCell(c)
      if(el!=null) el.prop('linkType','connection2subclass')
    })
    this.prop('subclassConnections',superclassConnections)
    this.prop('superclassConnections',subclassConnections)
    this.prop('connectionType',type)
  }
}
export class ConnectionPointView extends dia.ElementView {
  render() {
    dia.ElementView.prototype.render.apply(this, arguments)
    this.el.querySelector('.connectionTypeLabelInput').innerText = this.model.prop('labelText')
  }
  initialize() {
    dia.ElementView.prototype.initialize.apply(this, arguments)
    this.listenTo(this.model, 'change', (model, options) => {
      this.render()
      let paper = this.paper
      this.model.prop('superclassConnections').forEach((c) => {
        let el = paper.model.getCell(c)
        let conView = paper.findViewByModel(el)
        if(conView != null){
          conView.render()
          conView.manageTools()
        }
      })
      this.model.prop('subclassConnections').forEach((c) => {
        let el = paper.model.getCell(c)
        let conView = paper.findViewByModel(el)
        if(conView != null){
          conView.render()
          conView.manageTools()
        }
      })
    })
  }
  manageInput(e) {
    let labelText = e.currentTarget.innerText.trim()
    if(labelText != 'd' && labelText != 'o' && labelText != 'u'){
      while (e.currentTarget.firstChild) e.currentTarget.removeChild(e.currentTarget.firstChild)
      this.model.prop('labelText','')
      this.model.setType('specialization')
    } else{
      this.model.prop('labelText',labelText)
      if (labelText == 'u') this.model.setType('category')
      else this.model.setType('specialization')
    }
  }
  events () {
    return {
      'input .connectionTypeLabelInput': (e) => {this.manageInput(e)}
    }
  }
}