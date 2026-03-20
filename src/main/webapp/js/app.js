const dia = joint.dia
const shapes = joint.shapes
const util = joint.util
const elementTools = joint.elementTools
const linkTools = joint.linkTools


import {
  Entity,
  Attribute,
  Relation,
  AttributeButton,
  SettingsButton,
  LinkButton,
  RelationView,
  AttributeView,
  EntityView,
  AttributeLink,
  RelationshipLink,
  RelationshipLinkView,
  InheritanceLink,
  InheritanceLinkView,
  ConnectionPoint,
  ConnectionPointView
} from './Node.js';


export class App {
    static showGraph (data) {
        //const default_width = 1000
        //const default_height = 600
        const default_width = 0
        const default_height = 0

        const namespace = {
        ...shapes,
        erd: {
            Attribute,
            Entity,
            Relation,
            RelationView,
            AttributeView,
            EntityView,
            AttributeLink,
            RelationshipLink,
            RelationshipLinkView,
            InheritanceLink,
            InheritanceLinkView,
            ConnectionPoint,
            ConnectionPointView
        }
        };
        const graph = new dia.Graph({linking: false}, { cellNamespace: namespace });
        const paper = new dia.Paper({
        el: document.getElementById('erd_container'),
        model: graph,
        width: default_width,
        height: default_height,
        background: { color: 'white' },
        cellViewNamespace: namespace,
        guard: (e) => e.target.getAttribute('contenteditable') != null,
        interactive: false
        });
        graph.fromJSON(JSON.parse(data))
        let cont = document.querySelector('#erd_container')
        let cells = graph.getCells()
        //cells.forEach((c) => {
        //  if(c.prop('type') == 'erd.InheritanceLink') paper.findViewByModel(c).manageTools()
        //  else addTools(c)
        //})

        // Redimensionar contenedor
        let dim = cells.reduce((m, c) => {
          let view = paper.findViewByModel(c)
          if(view == null) return m
          let bbox = view.getBBox()
          if(bbox.x + bbox.width > m.w) m.w = bbox.x + bbox.width
          if(bbox.y + bbox.height > m.h) m.h = bbox.y + bbox.height
          return m
        },{w: default_width, h: default_height})
        cont.style.width = (dim.w+20)+'px'
        cont.style.height = (dim.h+20)+'px'
        }
}