import {messages} from "./messages.js"

class Mapper {
    static checkSolution (baseER0, studentRelational) {
        const baseER = JSON.parse(JSON.stringify(baseER0))
        let result
        const runningRelational = {
            relations: []
        }
        while(baseER.entities.length > 0 || baseER.relationships.length > 0 || baseER.specializations.length > 0 || baseER.categories.length > 0){
            result = Mapper.mapStrongEntities(baseER, studentRelational, runningRelational)
            if (result != null) return result
            result = Mapper.mapWeakEntities(baseER, studentRelational, runningRelational)
            if (result != null) return result
            result = Mapper.mapRelationships(baseER, studentRelational, runningRelational)
            if (result != null) return result
            result = Mapper.mapMultivaluedAttributes(baseER, studentRelational, runningRelational)
            if (result != null) return result
            result = Mapper.mapSpecializations(baseER, studentRelational, runningRelational)
            if (result != null) return result
            result = Mapper.mapCategories(baseER, studentRelational, runningRelational)
            if (result != null) return result
        }
        return {isCorrect: true, message: Mapper.msg('CORRECT')}
    }

    static msg(msgCode, args = []){
        const language = navigator.language
        const msg = messages[msgCode]
        const default_lang = 'es-ES'
        let langMsg = msg[language] || msg[default_lang]
        for(let i=0;i<args.length;i++){
            let regExp = new RegExp('\\$'+i,'g')
            langMsg = langMsg.replace(regExp,args[i])
        } 
        return langMsg
    }

    static getRelationPK (runningRelational, relationName) {
        const rel = runningRelational.find((r) => r.name === relationName)
        if (rel == null) return null
        const pkAttr = rel.attributes.filter((a) => a.isPK)
        return pkAttr
    }

    static takesPartInSpeOrCat (baseER, entityName) {
        for (const s of baseER.specializations){
            if (s.superclassEntityName == entityName) return true
            if (s.subclassEntityNames.indexOf(entityName) != -1) return true
        }
        for (const c of baseER.categories){
            if (c.subclassEntityName == entityName) return true
            if (c.superclassEntityNames.indexOf(entityName) != -1) return true
        }
        return false
    }

    static getLeafAttributes (attribute) {
        const attributes = []
        for(const a of attribute.subattributes){
            if (a.subattributes != null && a.subattributes.length > 0){
                attributes.concat(Mapper.getLeafAttributes(a))
            } 
            else{
                attributes.push(a)
            }
        }
        return attributes
    }

    static mapStrongEntities (baseER, studentRelational, runningRelational) {
        for(const entity of baseER.entities){
            if (entity.isWeak) continue
            if (Mapper.takesPartInSpeOrCat(baseER,entity.name)) continue
            const relPos = baseER.entities.findIndex((e) => e.name == entity.name)
            let relation = runningRelational.relations.find((r) => r.name == entity.name)
            if (relation == null){
                relation = {
                    name: entity.name,
                    attributes: [],
                    fks: []
                }
                runningRelational.relations.push(relation)
            }
            const studentRelation = studentRelational.relations.find((r) => r.name == entity.name)
            if (studentRelation == null){
                return {isCorrect: false, message: Mapper.msg('MISSING_RELATION',[entity.name])}
            }
            let candidateKeys = []
            for(const attr of entity.attributes){
                const pos = entity.attributes.findIndex((a) => a.name == attr.name)
                if(attr.isDerivated){
                    const studentAttribute = studentRelation.attributes.find((a) => a.name == attr.name)
                    if (studentAttribute != null){
                        return {isCorrect: false, message: Mapper.msg('DERIVATE_ATTRIBUTE_INCLUDED', [attr.name, entity.name])}
                    }
                    entity.attributes.splice(pos,1)
                }
                else if (attr.isMultivalued) continue
                else if (attr.isKey && (attr.subattributes == null || attr.subattributes.length == 0)){
                    const studentAttribute = studentRelation.attributes.find((a) => a.name == attr.name)
                    if (studentAttribute == null){
                        return {isCorrect: false, message: Mapper.msg('MISSING_KEY_ATTRIBUTE', [attr.name, studentRelation.name])}
                    }
                    relation.attributes.push({name: attr.name})
                    candidateKeys.push([attr])
                    entity.attributes.splice(pos,1)
                }
                else if (attr.isKey && (attr.subattributes != null && attr.subattributes.length > 0)){
                    const subattributes = Mapper.getLeafAttributes(attr)
                    candidateKeys.push(subattributes)
                    for(const sa of subattributes){
                        const studentAttribute = studentRelation.attributes.find((a) => a.name == sa.name)
                        if (studentAttribute == null){
                            return {isCorrect: false, message: Mapper.msg('MISSING_SUBATTRIBUTE_PART_OF_KEY', [attr.name, studentRelation.name])}
                        }
                        relation.attributes.push({name: sa.name})
                    }
                    entity.attributes.splice(pos,1)
                }
                else if (attr.subattributes != null && attr.subattributes.length > 0){
                    for(const sub of attr.subattributes) entity.attributes.push(sub)
                    entity.attributes.splice(pos,1)
                }
                else if (!attr.isPartialKey){
                    const studentAttribute = studentRelation.attributes.find((a) => a.name == attr.name)
                    if (studentAttribute == null){
                        return {isCorrect: false, message: Mapper.msg('MISSING_REGULAR_ATTRIBUTE',[attr.name, studentRelation.name])}
                    }
                    relation.attributes.push({name: attr.name})
                    entity.attributes.splice(pos,1)
                }
            }
            
            if(candidateKeys.length == 1){
                for(const pkA of candidateKeys[0]){
                    const pkAttr = relation.attributes.find((a) => a.name == pkA.name)
                    pkAttr.isPK = true
                    const studentAttr = studentRelation.attributes.find((a) => a.name == pkA.name)
                    if (!studentAttr.isPK){
                        return {isCorrect: false, message: Mapper.msg('MISSING_ATTRIBUTE_IN_PK',[pkA.name, studentRelation.name])}
                    }
                }                
            }
            else if(candidateKeys.length > 1){
                const studentPK = studentRelation.attributes.filter((a) => a.isPK)
                if (studentPK == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_PK',[studentRelation.name])}
                }
                const usedPK = candidateKeys.find((c) => {
                    if (c.length != studentPK.length) return false
                    for (const a of c){
                        const studentA = studentPK.find((at) => at.name == a.name)
                        if (studentA == null) return false
                    }
                    return true
                })
                if (usedPK == null){
                    return {isCorrect: false, message: Mapper.msg('WRONG_PK',[studentRelation.name])}
                }
                for (const a of usedPK){
                    a.isPK = true
                }
            }
            if (entity.attributes.length == 0){
                baseER.entities.splice(relPos,1)
            }
        }
        return null
    }

    static mapWeakEntities (baseER, studentRelational, runningRelational) {
        /*for (const ent of baseER.entities){
            
            if (!ent.isWeak) continue
            const identifierRel = baseER.relationships.filter((r) => {
                if (!r.isIdentificator) return false
                const participation = r.participants.find((p) => p.entityName == ent.name && p.minCardinality == 1 && p.maxCardinality == 1)
                return participation != null
            })
            if (identifierRel.length == 0) continue

            const relationshipAttributes = []
            identifierRel.forEach((r) => relationshipAttributes.concat(r.attributes))
            const proprietaries = []
            identifierRel.forEach((r) => {
                const proprietaryNames = r.participants.map((p) => p.name).filter((rName) => rName != ent.name)
                proprietaries.concat(proprietaryNames)
            })

            const propWithPK = proprietaries.find((p) => {
                const rel = runningRelational.relations.find((rel) => {
                    if (rel.name != p) return false
                    const pk = rel.attributes.find((a) => a.isPK)
                    return pk != null
                })
                return rel != null
            })

            if (propWithPK.length != proprietaries.length) continue

            const propietariesPKAttributes = []
            propWithPK.forEach((p) => {
                const pkAttr = p.attributes.filter((a) => a.isPK)
                propietariesPKAttributes.concat(pkAttr)
            })


            // start copy

            if (Mapper.takesPartInSpeOrCat(baseER,ent.name)) continue
            const relPos = baseER.entities.findIndex((e) => e.name == ent.name)
            let relation = runningRelational.relations.find((r) => r.name == ent.name)
            if (relation == null){
                relation = {
                    name: entity.name,
                    attributes: [],
                    fks: []
                }
                runningRelational.relations.push(relation)
            }
            const studentRelation = studentRelational.relations.find((r) => r.name == ent.name)
            if (studentRelation == null){
                return {isCorrect: false, errors: [messages.MISSING_WEAK_ENTITY_RELATION.es]}
            }

            propietariesPKAttributes.forEach((ppk) => {
                relation.attributes.push({name: ppk.name, isPK: true})
                // todo -> continue here
            })



            let candidateKeys = []
            for(const attr of entity.attributes){
                const pos = entity.attributes.findIndex((a) => a.name == attr.name)
                if(attr.isDerivate){
                    const studentAttribute = studentRelation.attributes.find((a) => a.name == attr.name)
                    if (studentAttribute != null){
                        return {isCorrect: false, errors: [messages.DERIVATE_ATTRIBUTE_INCLUDED.es]}
                    }
                    entity.attributes.splice(pos,1)
                }
                else if (attr.isMultivalued) continue
                else if (attr.isKey && (attr.subattributes == null || attr.subattributes.length == 0)){
                    const studentAttribute = studentRelation.attributes.find((a) => a.name == attr.name)
                    if (studentAttribute != null){
                        return {isCorrect: false, errors: [messages.MISSING_KEY_ATTRIBUTE.es]}
                    }
                    relation.attributes.push({name: attr.name})
                    candidateKeys.push([attr])
                    entity.attributes.splice(pos,1)
                }
                else if (attr.isKey && (attr.subattributes != null && attr.subattributes.length > 0)){
                    const subattributes = Mapper.getLeafAttributes(attr)
                    candidateKeys.push(subattributes)
                    for(const sa of subattributes){
                        const studentAttribute = studentRelation.attributes.find((a) => a.name == sa.name)
                        if (studentAttribute == null){
                            return {isCorrect: false, errors: [messages.MISSING_SUBATTRIBUTE_PART_OF_KEY.es]}
                        }
                        relation.attributes.push({name: sa.name})
                    }
                    entity.attributes.splice(pos,1)
                }
                else if (attr.subattributes != null && attr.subattributes.length > 0){
                    for(const sub of attr.subattributes) entity.attributes.push(sub)
                    entity.attributes.splice(pos,1)
                }
                else if (!attr.isPartialKey){
                    const studentAttribute = studentRelation.attributes.find((a) => a.name == attr.name)
                    if (studentAttribute == null){
                        return {isCorrect: false, errors: [messages.MISSING_REGULAR_ATTRIBUTE.es]}
                    }
                    relation.attributes.push({name: attr.name})
                    entity.attributes.splice(pos,1)
                }
            }
            
            if(candidateKeys.length == 1){
                for(const pkA of candidateKeys[0]){
                    const pkAttr = relation.attributes.find((a) => a.name == pkA.name)
                    pkAttr.isPK = true
                    const studentAttr = studentRelation.attributes.find((a) => a.name == pkA.name)
                    if (!studentAttr.isPK){
                        return {isCorrect: false, errors: [messages.MISSING_ATTRIBUTE_IN_PK.es]}
                    }
                }                
            }
            else if(candidateKeys.length > 1){
                // todo
                // follow student decision
            }

            if (entity.attributes.length == 0){
                baseER.entities.splice(relPos,1)
            }


            // end copy



        }
        
        return null*/

        return null
    }

    static mapMultivaluedAttributes (baseER, studentRelational, runningRelational) {
        
        for(const entity of baseER.entities){
            const multivaluedAttrs = entity.attributes.filter((a) => a.isMultivalued)
            if (multivaluedAttrs.length == 0) continue
            const entityTable = runningRelational.relations.find((r) => r.name == entity.name)
            if (entityTable == null) continue
            const pkAttributes = entityTable.attributes.filter((a) => a.isPK)
            if (pkAttributes.length == 0) continue
            
            for(const multi of multivaluedAttrs) {
                const relation = {
                    name: multi.name,
                    attributes: [],
                    fks: []
                }
                runningRelational.relations.push(relation) 

                const studentRelation = studentRelational.relations.find((r) => r.name == multi.name)
                if (studentRelation == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_MULTIVALUED_RELATION', [multi.name, multi.name])}
                }

                for (const a of pkAttributes) {
                    const studentAttr = studentRelation.attributes.find((sAt) => sAt.name == a.name)
                    if (studentAttr == null){
                        return {isCorrect: false, message: Mapper.msg('MISSING_MULTIVALUED_RELATION_ENTITY_PK_ATTRIBUTE', [multi.name, a.name, entity.name])}
                    }
                    if (!studentAttr.isPK){
                        return {isCorrect: false, message: Mapper.msg('MISSING_MULTIVALUED_RELATION_ENTITY_PK', [multi.name, a.name])}
                    }
                    relation.attributes.push({name: a.name, isPK: true})
                }

                relation.fks.push({
                    targetRelation: entity.name,
                    attributes: pkAttributes.map((a) => a.name)
                })

                const fk = studentRelation.fks.find((f) => {
                    if (f.targetRelation != entity.name) return false
                    if (f.attributes.length != pkAttributes.length) return false
                    const differentAttr = pkAttributes.map((a) => a.name).find((a) => f.attributes.indexOf(a) == -1)
                    return differentAttr == null
                })

                if (fk == null){
                    return {isCorrect: false, message: Mapper.msg('WRONG_MULTIVALUED_FK', [multi.name, entity.name])}
                }

                const getRegularLeafAttributes = (multivaluedAttribute) => {
                    const leaves = []
                    if (multivaluedAttribute.subattributes == null || multivaluedAttribute.subattributes.length == 0){
                        return [multivaluedAttribute]
                    }
                    for(const ma of multivaluedAttribute.subattributes) {
                        if(ma.isDerivate) continue
                        // todo -> tener en cuenta otros tipos de atributos, viendo qué es posible y qué no
                        leaves = leaves.concat(getRegularLeafAttributes(ma))
                    }
                    return leaves
                }

                const regularAttributes = getRegularLeafAttributes(multi)

                for (const ra of regularAttributes) {
                    relation.attributes.push({
                        name: ra.name,
                        isPK: true
                    })

                    const studentAttr = studentRelation.attributes.find((a) => a.name == ra.name)
                    if (studentAttr == null){
                        return {isCorrect: false, message: Mapper.msg('MISSING_MULTIVALUED_ATTRIBUTE_IN_RELATION', [multi.name, ra.name])}
                    }
                    if (!studentAttr.isPK){
                        return {isCorrect: false, message: Mapper.msg('MISSING_MULTIVALUED_ATTRIBUTE_IN_RELATION_PK', [multi.name, ra.name])}
                    }
                }

                const multiAttrPos = entity.attributes.findIndex((a) => a.name == multi.name)
                entity.attributes.splice(multiAttrPos,1)

                if (entity.attributes.length == 0){
                    const entityPos = baseER.entities.findIndex((e) => e.name == entity.name)
                    baseER.entities.splice(entityPos,1)
                }                
            } 
        }
        return null
    }

    static mapRelationships (baseER, studentRelational, runningRelational) {
        let result
        for(const rel of baseER.relationships){
            if (rel.participants.length > 2){
                result = Mapper.mapNAryRelationships(baseER, studentRelational, runningRelational, rel)
                if (result != null) return result
                continue
            }   
            const card1 = rel.participants[0].maxCardinality
            const card2 = rel.participants[1].maxCardinality
            if (card1 == '1' && card2 == '1'){
                result = Mapper.map11Relationship(baseER, studentRelational, runningRelational, rel)
                if (result != null) return result
                continue
            }
            else if (card1 == '1' && card2 == 'N'){
                result = Mapper.map1NRelationship(baseER, studentRelational, runningRelational, rel)
                if (result != null) return result
                continue
            } 
            else {
                result = Mapper.mapMNRelationship(baseER, studentRelational, runningRelational, rel)
                if (result != null) return result
                continue
            }
        }
        return null
    }

    static mapRelationshipAttributes (baseER, studentRelational, runningRelational, relationship, targetRelation) {
        // todo
        // todo -> gestionar atributos del vínculo
            /*
            let i = 0
            while (relationship.attributes.length > 0){
                // todo -> gestionar diferentes tipos de atributos: derivados, multivaluados, compuestos
                
                const attr = studentRelWithFK.attributes.find((sa) => (sa.checked == null || sa.checked == false) && a.name == sa.name)
                if (attr == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_RELATIONSHIP_ATTR',[relationship.label, studentRelWithFK.name, a.name])}
                }

            }
            */
        return null
    }

    // todo -> falta terminar
    static mapNAryRelationships (baseER, studentRelational, runningRelational, relationship){
        const pos = baseER.relationships.find((r) => r == relationship)
        const relations = []
        for (const p of relationship.participants){
            const r = runningRelational.relations.find((r) => r.name == p.entityName)
            if (r == null) return null // todavía no se ha transformado
            relations.push(r)
        }

        const pkRelations = []
        for(const r of relations){
            const pkR = r.attributes.filter((a) => a.isPK)
            if (pkR == null || pkR.length == 0) return null // todavía no se ha definido la PK
            pkRelations.push(pkR)
        }

        const candidateKeys = []

        const maxCard1Participants = relationship.participants.filter((p) => p.maxCardinality == '1')
        if (maxCard1Participants.length == 0){
            candidateKeys.push(pkRelations.flat())
        } 
        else {
            for(const m of maxCard1Participants){
                const partRelPos = relations.findIndex((r) => r.name == m.entityName)
                candidateKeys.push([pkRelations[partRelPos]])
            }
        }

        const studentNaryRelation = studentRelational.relations.find((r) => r.name == relationship.label)
        if (studentNaryRelation == null){
            return {isCorrect: false, message: Mapper.msg('MISSING_NARY_RELATION',[relationship.label])}
        }

        const runningRelation = {
            name: relationship.label,
            attributes: [],
            fks: []
        }
        runningRelational.relations.push(runningRelation)

        for(let i=0;i<pkRelations.length;i++){
            const r = relations[i]
            const pkAttrs = pkRelations[i]
            for(const a of pkAttrs){
                const regExp = new RegExp(a.name+"'*")
                const attr = studentNaryRelation.attributes.find((at) => regExp.test(at.name))
                if (attr == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_NARY_RELATION_ATTRIBUTE',[relationship.label, a.name, r.name])}
                }
                runningRelation.attributes.push({
                    name: a.name
                })
            }
        }

        for(let i=0;i<pkRelations.length;i++){
            const r = relations[i]
            const pkAttrs = pkRelations[i]
            const studentFK = studentNaryRelation.fks.find((fk) => fk.targetRelation == r.name && fk.checked == null || fk.checked == false)
            if (studentFK == null) {
                return {isCorrect: false, message: Mapper.msg('MISSING_NARY_RELATION_FK',[relationship.label, r.name])}
            }

            for (const a of pkAttrs){
                const regExp = new RegExp(a.name+"'*")
                const fkAttr = studentFK.attributes.find((fkAttr) => regExp.test(fkAttr))
                if (fkAttr == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_NARY_RELATION_FK_ATTRIBUTES',[relationship.label, r.name, a.name])}
                }
            }
            if (studentFK.attributes.length != pkAttrs.length){
                return {isCorrect: false, message: Mapper.msg('MORE_NARY_RELATION_FK_ATTRIBUTES',[studentNaryRelation.name, r.name])}
            }
            studentFK.checked = true

            runningRelation.fks.push({
                targetRelation: r.name,
                attributes: pkAttrs.map((a) => a.name)
            })
        }

        // todo -> gestionar claves candidatas


        
        let result = Mapper.mapRelationshipAttributes(baseER, studentRelational, runningRelational, relationship, studentNaryRelation)
        if (result != null) return result
        baseER.relationships.splice(pos,1)
        return null
    }

    static map11Relationship (baseER, studentRelational, runningRelational, relationship){
        const pos = baseER.relationships.find((r) => r == relationship)
        const minCard1 = relationship.participants[0].minCardinality
        const minCard2 = relationship.participants[1].minCardinality
        let participantWithFK, participantNoFK
        if (minCard1 == '1' && minCard2 == '0'){ // la fk sí o sí en el participante 1
            participantWithFK = 0
            participantNoFK = 1
        }
        else if (minCard1 == '0' && minCard2 == '1'){ // la fk sí o sí en el participante 2
            participantWithFK = 1
            participantNoFK = 0
        }

        if (minCard1 != minCard2){
            const relWithFK = runningRelational.relations.find((r) => r.name == relationship.participants[participantWithFK].entityName)
            const relNoFK = runningRelational.relations.find((r) => r.name == relationship.participants[participantNoFK].entityName)
            const studentRelWithFK = studentRelational.relations.find((r) => r.name == relationship.participants[participantWithFK].entityName)
            const studentRelNoFK = studentRelational.relations.find((r) => r.name == relationship.participants[participantNoFK].entityName)

            if (relWithFK == null || relNoFK == null) return null // todavía no se ha transformado alguna de las relaciones participantes

            const pkRelNoFK = relNoFK.attributes.filter((a) => a.isPK)
            if (pkRelNoFK == null || pkRelNoFK.length == 0) return null // la relación a referenciar todavía no tiene PK


            for (const a of pkRelNoFK){
                const regExp = new RegExp(a.name+"'*")
                const attr = studentRelWithFK.attributes.find((sa) => (sa.checked == null || sa.checked == false) && regExp.test(sa.name))
                if (attr == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_FK_ATTR',[relationship.label, studentRelWithFK.name, a.name, studentRelNoFK.name])}
                }
                relWithFK.attributes.push({name: attr.name})
                attr.checked = true
            }

            const studentFK = studentRelWithFK.fks.find((fk) => (fk.checked == null || fk.checked == false) && fk.targetRelation == studentRelNoFK.name)
            if (studentFK == null){
                return {isCorrect: false, message: Mapper.msg('MISSING_FK',[studentRelWithFK.name, studentRelNoFK.name, relationship.label])}
            }
            for (const a of pkRelNoFK){
                const regExp = new RegExp(a.name+"'*")
                const fkAttr = studentFK.attributes.find((fkAttr) => regExp.test(fkAttr))
                if (fkAttr == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_ATTR_IN_FK',[studentRelWithFK.name, studentRelNoFK.name, a.name])}
                }
            }
            if (studentFK.attributes.length != pkRelNoFK.length){
                return {isCorrect: false, message: Mapper.msg('MORE_ATTR_IN_FK',[studentRelWithFK.name, studentRelNoFK.name])}
            }

            let result = Mapper.mapRelationshipAttributes(baseER, studentRelational, runningRelational, relationship, relWithFK)
            if (result != null) return result
        }
        else { // ver qué ha hecho el alumno
            // todo!!!

        }
        baseER.relationships.splice(pos,1)
        return null
    }

    // done!
    static map1NRelationship (baseER, studentRelational, runningRelational, relationship){
        const pos = baseER.relationships.find((r) => r == relationship)
        const maxCard1 = relationship.participants[0].maxCardinality
        const maxCard2 = relationship.participants[1].maxCardinality
        let participantWithFK, participantNoFK
        if (maxCard1 == '1' && maxCard2 == 'N'){
            participantWithFK = 0
            participantNoFK = 1
        }
        else {
            participantWithFK = 1
            participantNoFK = 0
        }

        const relWithFK = runningRelational.relations.find((r) => r.name == relationship.participants[participantWithFK].entityName)
        const relNoFK = runningRelational.relations.find((r) => r.name == relationship.participants[participantNoFK].entityName)
        const studentRelWithFK = studentRelational.relations.find((r) => r.name == relationship.participants[participantWithFK].entityName)
        const studentRelNoFK = studentRelational.relations.find((r) => r.name == relationship.participants[participantNoFK].entityName)

        if (relWithFK == null || relNoFK == null) return null // todavía no se ha transformado alguna de las relaciones participantes

        const pkRelNoFK = relNoFK.attributes.filter((a) => a.isPK)
        if (pkRelNoFK == null || pkRelNoFK.length == 0) return null // la relación a referenciar todavía no tiene PK

        for (const a of pkRelNoFK){
            const regExp = new RegExp(a.name+"'*")
            const attr = studentRelWithFK.attributes.find((sa) => (sa.checked == null || sa.checked == false) && regExp.test(sa.name))
            if (attr == null){
                return {isCorrect: false, message: Mapper.msg('MISSING_FK_ATTR',[relationship.label, studentRelWithFK.name, a.name, studentRelNoFK.name])}
            }
            relWithFK.attributes.push({name: attr.name})
            attr.checked = true
        }

        const studentFK = studentRelWithFK.fks.find((fk) => (fk.checked == null || fk.checked == false) && fk.targetRelation == studentRelNoFK.name)
        if (studentFK == null){
            return {isCorrect: false, message: Mapper.msg('MISSING_FK',[studentRelWithFK.name, studentRelNoFK.name, relationship.label])}
        }
        for (const a of pkRelNoFK){
            const regExp = new RegExp(a.name+"'*")
            const fkAttr = studentFK.attributes.find((fkAttr) => regExp.test(fkAttr))
            if (fkAttr == null){
                return {isCorrect: false, message: Mapper.msg('MISSING_ATTR_IN_FK',[studentRelWithFK.name, studentRelNoFK.name, a.name])}
            }
        }
        if (studentFK.attributes.length != pkRelNoFK.length){
            return {isCorrect: false, message: Mapper.msg('MORE_ATTR_IN_FK',[studentRelWithFK.name, studentRelNoFK.name])}
        }

        let result = Mapper.mapRelationshipAttributes(baseER, studentRelational, runningRelational, relationship, relWithFK)
        if (result != null) return result
        baseER.relationships.splice(pos,1)
        return null
    }

    // done
    static mapMNRelationship (baseER, studentRelational, runningRelational, relationship){
        const pos = baseER.relationships.find((r) => r == relationship)
        const relPart1 = runningRelational.relations.find((r) => r.name == relationship.participants[0].entityName)
        const relPart2 = runningRelational.relations.find((r) => r.name == relationship.participants[1].entityName)

        if (relPart1 == null || relPart2 == null) return null // todavía no se ha transformado

        const pkRelPart1 = relPart1.attributes.filter((a) => a.isPK)
        const pkRelPart2 = relPart2.attributes.filter((a) => a.isPK)
        
        if (pkRelPart1 == null || pkRelPart1.length == 0 || pkRelPart2 == null || pkRelPart2.length == 0) return null // alguna de las relaciones todavía no tiene PK

        const studentRelRelation = studentRelational.relations.find((r) => r.name == relationship.label)

        if (studentRelRelation == null){
            return {isCorrect: false, message: Mapper.msg('MISSING_MN_RELATION',[relationship.label])}
        }
        const runningRelRelation = {
            name: relationship.label,
            attributes: [],
            fks: []
        }
        runningRelational.relations.push(runningRelRelation)

        for(const a of pkRelPart1){
            const regExp = new RegExp(a.name+"'*")
            const studentAttr = studentRelRelation.attributes.find((at) => regExp.test(at.name))
            if (studentAttr == null){
                return {isCorrect: false, message: Mapper.msg('MISSING_MN_RELATION_ATTRIBUTE',[relationship.label, relPart1.name, a.name])}
            }
            if (!studentAttr.isPK){
                return {isCorrect: false, message: Mapper.msg('MISSING_ATTRIBUTE_IN_MN_RELATION_PK',[relationship.label, a.name])}
            }
            const runningAttr = {
                name: a.name,
                checked: true
            }
            runningRelRelation.attributes.push(runningAttr)
        }

        for(const a of pkRelPart2){
            const regExp = new RegExp(a.name+"'*")
            const studentAttr = studentRelRelation.attributes.find((at) => regExp.test(at.name))
            if (studentAttr == null){
                return {isCorrect: false, message: Mapper.msg('MISSING_MN_RELATION_ATTRIBUTE',[relationship.label, relPart2.name, a.name])}
            }
            if (!studentAttr.isPK){
                return {isCorrect: false, message: Mapper.msg('MISSING_ATTRIBUTE_IN_MN_RELATION_PK',[relationship.label, a.name])}
            }
            const runningAttr = {
                name: a.name,
                checked: true,
                isPK: true
            }
            runningRelRelation.attributes.push(runningAttr)
        }

        const fk1 = studentRelRelation.fks.find((fk) => {
            if (fk.checked != null && fk.checked == true) return false
            if (fk.targetRelation != relPart1.name) return false
            return true
        })
        if (fk1 == null){
            return {isCorrect: false, message: Mapper.msg('MISSING_MN_RELATION_FK',[relationship.label, relPart1.name])}
        } 
        else {
            for (const fkAttr of pkRelPart1){
                const fkA = fk1.attributes.find((f) => f == fkAttr.name)
                if (fkA == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_MN_RELATION_FK_ATTRIBUTE',[relationship.label, relPart1.name, fkAttr.name])}
                }
            }
            if (fk1.attributes.length > pkRelPart1.length){
                return {isCorrect: false, message: Mapper.msg('MORE_MN_RELATION_FK_ATTRIBUTES',[relationship.label, relPart1.name])}
            }
            const fk = {
                attributes: pkRelPart1.map((a) => a.name),
                targetRelation: relPart1.name,
                checked: true
            }
            runningRelRelation.fks.push(fk)
        }

        const fk2 = studentRelRelation.fks.find((fk) => {
            if (fk.checked != null && fk.checked == true) return false
            if (fk.targetRelation != relPart2.name) return false
            return true
        })
        if (fk2 == null){
            return {isCorrect: false, message: Mapper.msg('MISSING_MN_RELATION_FK',[relationship.label, relPart2.name])}
        } 
        else {
            for (const fkAttr of pkRelPart2){
                const fkA = fk2.attributes.find((f) => f == fkAttr.name)
                if (fkA == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_MN_RELATION_FK_ATTRIBUTE',[relationship.label, relPart2.name, fkAttr.name])}
                }
            }
            if (fk2.attributes.length > pkRelPart2.length){
                return {isCorrect: false, message: Mapper.msg('MORE_MN_RELATION_FK_ATTRIBUTES',[relationship.label, relPart2.name])}
            }
            const fk = {
                attributes: pkRelPart2.map((a) => a.name),
                targetRelation: relPart2.name,
                checked: true
            }
            runningRelRelation.fks.push(fk)
        }

        let result = Mapper.mapRelationshipAttributes(baseER, studentRelational, runningRelational, relationship, studentRelRelation)
        if (result != null) return result
        baseER.relationships.splice(pos,1)
        return null
    }

   static mapSpecializations(baseER, studentRelational, runningRelational) {
    for (let i = baseER.specializations.length - 1; i >= 0; i--) {
        const spec = baseER.specializations[i];
        const superRel = runningRelational.relations.find(r => r.name === spec.superclassEntityName);
        if (!superRel) continue;
        
        const superPK = superRel.attributes.filter(a => a.isPK);
        if (superPK.length === 0) continue;

        for (const subName of spec.subclassEntityNames) {
            if (runningRelational.relations.find(r => r.name === subName)) continue;
            const studentSubRel = studentRelational.relations.find(r => r.name === subName);
            if (!studentSubRel) return { isCorrect: false, message: Mapper.msg('MISSING_RELATION', [subName]) };

            const runningSubRel = { name: subName, attributes: [], fks: [] };

            // 1. Validar Clave Primaria Heredada
            for (const pkAttr of superPK) {
                const sAttr = studentSubRel.attributes.find(a => a.name === pkAttr.name);
                if (!sAttr || !sAttr.isPK) return { isCorrect: false, message: Mapper.msg('MISSING_ATTRIBUTE_IN_PK', [pkAttr.name, subName]) };
                runningSubRel.attributes.push({ name: pkAttr.name, isPK: true });
            }

            // 2. Validar FK a la superclase
            const studentFK = studentSubRel.fks.find(f => f.targetRelation === spec.superclassEntityName);
            if (!studentFK) return { isCorrect: false, message: Mapper.msg('MISSING_FK', [subName, spec.superclassEntityName, "Especialización"]) };
            runningSubRel.fks.push({ targetRelation: spec.superclassEntityName, attributes: superPK.map(a => a.name) });

            // 3. Validar Atributos Propios (Aquí entra el C2)
            const subEntER = baseER.entities.find(e => e.name === subName);
            if (subEntER) {
                for (let k = subEntER.attributes.length - 1; k >= 0; k--) {
                    const attr = subEntER.attributes[k];
                    if (attr.isKey) { subEntER.attributes.splice(k, 1); continue; }
                    const sAttr = studentSubRel.attributes.find(a => a.name === attr.name);
                    if (!sAttr) return { isCorrect: false, message: Mapper.msg('MISSING_REGULAR_ATTRIBUTE', [attr.name, subName]) };
                    runningSubRel.attributes.push({ name: attr.name });
                    subEntER.attributes.splice(k, 1);
                }
                if (subEntER.attributes.length === 0) baseER.entities.splice(baseER.entities.indexOf(subEntER), 1);
            }
            runningRelational.relations.push(runningSubRel);
        }
        baseER.specializations.splice(i, 1);
    }
    return null;
}

    static mapCategories (baseER, studentRelational, runningRelational) {
        for(const cat of baseER.categories){
            const catName = cat.categoryEntityName
            const superNames = cat.superclassEntityNames
            const type = cat.type || 'U'
            const isTtal=cat.isTotal
            
            const catRel = studentRelational.relations.find(r=> r.name==catName)
            
            //existe categoria
            if(catRel == null){
                return {isCorrect:false, message: Mapper.msg('MISSIN_CATEGORY_RELATION', [catName])}
            }
            
            //obtener superclases y sus PK
            const superRels=[]
            
            for(const superName of superNames){
                const superRel=studentRelational.relations.find(r => r.name == superName)
                if(superRel ==null){
                    return {isCorrect:false, message:Mapper.msg('MISSING_SUPERCLASS_RELATION', [superName])}
                }
                
                const superPK = superRel.attributes.filter(a => a.isPK)
                
                if(superPK.length == 0){
                    return {isCorrect:false, message:Mapper.msg('MISSING_PK', [superName])}
                }
                
                superRels.push({name:superName, pk: superPK})
            }
            
            //PK de la categoria
            const catPK = catRel.attributes.filter(a=> a.isPK)
            
            if(catPK.length == 0){
                 return {isCorrect:false, message: Mapper.msg('MISSING_PK', [catName])}
            }
            
            
            //diferencias c,d,u
            let validPK = false
            if(type=='U'){
                for (const superRel of superRels){
                    const match = superRel.pk.every(pkAttr => catPK.find(a => a.name == pkAttr.name) != null) && superRel.pk.length == catPK.length
                    
                    if(match){
                        validPK = true
                        break
                    }
                }
                if (!validPK){
                     return {isCorrect:false, message:Mapper.msg('WRONG_PK', [catName])}   
                }
            }
            
            else if (type=='D'){
                let matchCount =0
                for(const superRel of superRels){
                    const match = superRel.pk.every(pkAttr => catPK.find(a => a.name == pkAttr.name) != null) && superRel.pk.length == catPK.length
                    if(match){
                        matchCount++
                    }
                }
                if(matchCount !==1){
                    return{
                        isCorrect:false,
                        message: Mapper.msg('CATEGORY_DISJOINT_ERROR', [catName])
                    }
                }
                validPK=true
            }
            else if(type=='C'){
                //deben incluir todas las PKs
                const allPK = superRels.flatMap(s=> s.pk)
                
                const match = allPK.every(pkAttr => catPK.find (a => a.name == pkAttr.name) !=null)
                
                if(!match || catPK.length != allPK.length){
                    return{
                        isCorrect:false,
                        message: Mapper.msg('CATEGORY_COMMON_ERROR', [catName])
                    }
                }
                
                validPK = true
            }
            
            //validar FK
            let fkCount=0
            
            for(const superRel of superRels){
                const fk = catRel.fks.find(fk => fk.targetRelation == superRel.name)
                
                if(fk){
                    fkCount++
                    for(const pkAttr of superRel.pk){
                        if(!fk.attributes.includes(pkAttr.name)){
                            return{
                                isCorrect:false,
                                message:Mapper.msg('WRONG_FK_IN_CATEGORY', [catName, pkAttr.name])
                            }
                        }
                    }
                }
            }
            
            //segun el tipo
            if(type =='D' && fkCount>1){
               return{
                   isCorrect:false,
                   message: Mapper.msg('CATEGORY_DISJOINT_FK_ERROR', [catName])
               }
            }
            if(type =='C' && fkCount!= superRels.length){
               return{
                   isCorrect:false,
                   message: Mapper.msg('CATEGORY_COMMON_FK_ERROR', [catName])
               }
            }
            
            if(type =='U' && fkCount==0){
               return{
                   isCorrect:false,
                   message: Mapper.msg('CATEGORY_UNION_FK_ERROR', [catName])
               }
            }
            
            //total o parcial
            if(isTotal){
                //debe haber FK
                if(fkCount ==0){
                    return {
                      isCorrect:false,
                      message: Mapper.msg('CATEGORY_TOTAL_ERROR', [catName])
                    }
                }
            }
            
            //eliminar categoria
            
            const pos = baseER.categories.indexOf(cat)
            baseER.categories.splice(pos,1)
            
        }
        return null
    }

}

export {Mapper}


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
            name...
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

/*

{
    relations: [
        {
            name: X,
            attributes: [
                {
                    name: X,
                    isPK: true/false
                }, ...
            ]
            fks: [
                {
                    targetRelation: X,
                    attributes: [X, Y, ...]
                }
            ]
        }, ...
    ]
}

*/










/*import {messages} from "./messages.js"

class Mapper {
    /*static checkSolution(baseER0, studentRelational) {
    try {
        const baseER = JSON.parse(JSON.stringify(baseER0));
        const runningRelational = { relations: [] };
        let result = null;
        let safetyCounter = 0;

        while (baseER.entities.length > 0 || baseER.relationships.length > 0 || 
               baseER.specializations.length > 0 || baseER.categories.length > 0) {
           
            let entBefore = baseER.entities.length;
            let relBefore = baseER.relationships.length;
            let specBefore = baseER.specializations.length;

            result = Mapper.mapStrongEntities(baseER, studentRelational, runningRelational);
            if (result != null) return result; // Aquí es donde devolverá "Falta el atributo A5..."

            result = Mapper.mapSpecializations(baseER, studentRelational, runningRelational);
            if (result != null) return result;
            
            if (safetyCounter++ > 100) {
                return { isCorrect: false, message: "Error: Bucle infinito detectado en Mapper." };
            }

            let changed = false;

            // --- ENTIDADES FUERTES ---
            //let entBefore = baseER.entities.length;
            result = Mapper.mapStrongEntities(baseER, studentRelational, runningRelational);
            if (result != null) return result;
            if (baseER.entities.length < entBefore) changed = true;

            // --- ESPECIALIZACIONES ---
           // let specBefore = baseER.specializations.length;
            result = Mapper.mapSpecializations(baseER, studentRelational, runningRelational);
            if (result != null) return result;
            if (baseER.specializations.length < specBefore) changed = true;

            // --- ENTIDADES DÉBILES ---
            let weakBefore = baseER.entities.length;
            result = Mapper.mapWeakEntities(baseER, studentRelational, runningRelational);
            if (result != null) return result;
            if (baseER.entities.length < weakBefore) changed = true;

            // --- RELACIONES ---
            //let relBefore = baseER.relationships.length;
            result = Mapper.mapRelationships(baseER, studentRelational, runningRelational);
            if (result != null) return result;
            if (baseER.relationships.length < relBefore) changed = true;

            if (!changed) {
                return { isCorrect: false, message: "La solución está incompleta o hay errores de nombres/claves." };
            }
            
            if (baseER.entities.length < entBefore || 
                baseER.relationships.length < relBefore || 
                baseER.specializations.length < specBefore) {
                changed = true;
            }
        }
        return { isCorrect: true, message: "¡CORRECTO!" };

    } catch (error) {
        // ESTO TE DIRÁ POR QUÉ NO SALE NADA
        console.error("ERROR EN EL MAPPER:", error);
        return { isCorrect: false, message: "ERROR TÉCNICO: " + error.message };
    }
}*/
/*    static checkSolution(baseER0, studentRelational) {
    try {
        const baseER = JSON.parse(JSON.stringify(baseER0));
        const runningRelational = { relations: [] };
        let result = null;
        let safetyCounter = 0;

        while (baseER.entities.length > 0 || baseER.relationships.length > 0 || 
               baseER.specializations.length > 0 || baseER.categories.length > 0) {
            
            if (safetyCounter++ > 100) {
                return { isCorrect: false, message: "Error: Bucle infinito detectado en Mapper." };
            }

            // Guardamos el estado actual antes de intentar mapear nada
            let entBefore = baseER.entities.length;
            let relBefore = baseER.relationships.length;
            let specBefore = baseER.specializations.length;
            let catBefore = baseER.categories ? baseER.categories.length : 0;

            // 1. Intentar mapear Entidades Fuertes
            result = Mapper.mapStrongEntities(baseER, studentRelational, runningRelational);
            if (result != null) return result; 

            // 2. Intentar mapear Especializaciones (Jerarquías)
            result = Mapper.mapSpecializations(baseER, studentRelational, runningRelational);
            if (result != null) return result;

            // 3. Intentar mapear Entidades Débiles
            result = Mapper.mapWeakEntities(baseER, studentRelational, runningRelational);
            if (result != null) return result;

            // 4. Intentar mapear Relaciones (1:1, 1:N, N:M)
            result = Mapper.mapRelationships(baseER, studentRelational, runningRelational);
            if (result != null) return result;

            // --- LÓGICA DE CONTROL DE CAMBIOS ---
            let changed = false;
            let catAfter = baseER.categories ? baseER.categories.length : 0;

            if (baseER.entities.length < entBefore || 
                baseER.relationships.length < relBefore || 
                baseER.specializations.length < specBefore ||
                catAfter < catBefore) {
                changed = true;
            }

            // Si después de pasar por todos los métodos no hemos borrado nada del baseER...
            if (!changed) {
                return { isCorrect: false, message: "La solución está incompleta o hay errores de nombres/claves." };
            }
        }
        
        return { isCorrect: true, message: Mapper.msg('CORRECT') };

    } catch (error) {
        console.error("ERROR EN EL MAPPER:", error);
        return { isCorrect: false, message: "ERROR TÉCNICO: " + error.message };
    }
}
   

    static msg(msgCode, args = []){
        const language = navigator.language
        const msg = messages[msgCode]
        const default_lang = 'es-ES'
        let langMsg = msg[language] || msg[default_lang]
        for(let i=0;i<args.length;i++){
            let regExp = new RegExp('\\$'+i,'g')
            langMsg = langMsg.replace(regExp,args[i])
        } 
        return langMsg
    }

    static getRelationPK (runningRelational, relationName) {
        const rel = runningRelational.relations.find((r) => r.name === relationName)
        if (rel == null) return null
        const pkAttr = rel.attributes.filter((a) => a.isPK)
        return pkAttr
    }

    static takesPartInSpeOrCat (baseER, entityName) {
        for (const s of baseER.specializations){
           // if (s.superclassEntityName == entityName) return true
            if (s.subclassEntityNames.indexOf(entityName) != -1) return true
        }
        for (const c of baseER.categories){
            if (c.subclassEntityName == entityName) return true
          //  if (c.superclassEntityNames.indexOf(entityName) != -1) return true
        }
        return false
    }

    static getLeafAttributes (attribute) {
        const attributes = []
        for(const a of attribute.subattributes){
            if (a.subattributes != null && a.subattributes.length > 0){
                //attributes.concat(Mapper.getLeafAttributes(a))
                attributes.push(...Mapper.getLeafAttributes(a))
            } 
            else{
                attributes.push(a)
            }
        }
        return attributes
    }

   static mapStrongEntities(baseER, studentRelational, runningRelational) {
    for (let i = baseER.entities.length - 1; i >= 0; i--) {
        const entity = baseER.entities[i];
        if (entity.isWeak || Mapper.takesPartInSpeOrCat(baseER, entity.name)) continue;

        const studentRelation = studentRelational.relations.find(r => r.name == entity.name);
        if (!studentRelation) return { isCorrect: false, message: Mapper.msg('MISSING_RELATION', [entity.name]) };

        let relation = runningRelational.relations.find(r => r.name == entity.name);
        if (!relation) {
            relation = { name: entity.name, attributes: [], fks: [] };
            runningRelational.relations.push(relation);
        }

        let candidateKeys = [];
        // Usamos un bucle para procesar atributos y poder modificar la lista
        for (let j = entity.attributes.length - 1; j >= 0; j--) {
            const attr = entity.attributes[j];

            if (attr.isDerivated) {
                if (studentRelation.attributes.find(a => a.name == attr.name)) 
                    return { isCorrect: false, message: Mapper.msg('DERIVATE_ATTRIBUTE_INCLUDED', [attr.name, entity.name]) };
                entity.attributes.splice(j, 1);
            } 
            else if (attr.isKey) {
                const subattrs = (attr.subattributes && attr.subattributes.length > 0) ? Mapper.getLeafAttributes(attr) : [attr];
                candidateKeys.push(subattrs);
                for (const sa of subattrs) {
                    if (!studentRelation.attributes.find(a => a.name == sa.name))
                        return { isCorrect: false, message: Mapper.msg('MISSING_KEY_ATTRIBUTE', [sa.name, studentRelation.name]) };
                    relation.attributes.push({ name: sa.name });
                }
                entity.attributes.splice(j, 1);
            } 
            // CAMBIO CLAVE AQUÍ PARA A5:
            else if (attr.subattributes != null && attr.subattributes.length > 0) {
                for (const sub of attr.subattributes) {
                    entity.attributes.push(sub);
                }
                entity.attributes.splice(j, 1); // ELIMINAMOS AL PADRE (A5)
            }
            else if (!attr.isPartialKey && !attr.isMultivalued) {
                if (!studentRelation.attributes.find(a => a.name == attr.name))
                    return { isCorrect: false, message: Mapper.msg('MISSING_REGULAR_ATTRIBUTE', [attr.name, studentRelation.name]) };
                relation.attributes.push({ name: attr.name });
                entity.attributes.splice(j, 1);
            }
        }

        // Validación de PK (Simplificada para que no falle)
        if (candidateKeys.length > 0) {
            const studentPK = studentRelation.attributes.filter(a => a.isPK);
            const chosenKey = candidateKeys.find(ck => 
                ck.length === studentPK.length && ck.every(attr => studentPK.some(spk => spk.name === attr.name))
            );
            if (!chosenKey) return { isCorrect: false, message: Mapper.msg('WRONG_PK', [studentRelation.name]) };
            for (const pkPart of chosenKey) {
                const attrInRel = relation.attributes.find(a => a.name === pkPart.name);
                if (attrInRel) attrInRel.isPK = true;
            }
        }

        if (entity.attributes.length == 0) baseER.entities.splice(i, 1);
    }
    return null;
}
    static mapWeakEntities (baseER, studentRelational, runningRelational) {
        /*for (const ent of baseER.entities){
            
            if (!ent.isWeak) continue
            const identifierRel = baseER.relationships.filter((r) => {
                if (!r.isIdentificator) return false
                const participation = r.participants.find((p) => p.entityName == ent.name && p.minCardinality == 1 && p.maxCardinality == 1)
                return participation != null
            })
            if (identifierRel.length == 0) continue

            const relationshipAttributes = []
            identifierRel.forEach((r) => relationshipAttributes.concat(r.attributes))
            const proprietaries = []
            identifierRel.forEach((r) => {
                const proprietaryNames = r.participants.map((p) => p.name).filter((rName) => rName != ent.name)
                proprietaries.concat(proprietaryNames)
            })

            const propWithPK = proprietaries.find((p) => {
                const rel = runningRelational.relations.find((rel) => {
                    if (rel.name != p) return false
                    const pk = rel.attributes.find((a) => a.isPK)
                    return pk != null
                })
                return rel != null
            })

            if (propWithPK.length != proprietaries.length) continue

            const propietariesPKAttributes = []
            propWithPK.forEach((p) => {
                const pkAttr = p.attributes.filter((a) => a.isPK)
                propietariesPKAttributes.concat(pkAttr)
            })


            // start copy

            if (Mapper.takesPartInSpeOrCat(baseER,ent.name)) continue
            const relPos = baseER.entities.findIndex((e) => e.name == ent.name)
            let relation = runningRelational.relations.find((r) => r.name == ent.name)
            if (relation == null){
                relation = {
                    name: entity.name,
                    attributes: [],
                    fks: []
                }
                runningRelational.relations.push(relation)
            }
            const studentRelation = studentRelational.relations.find((r) => r.name == ent.name)
            if (studentRelation == null){
                return {isCorrect: false, errors: [messages.MISSING_WEAK_ENTITY_RELATION.es]}
            }

            propietariesPKAttributes.forEach((ppk) => {
                relation.attributes.push({name: ppk.name, isPK: true})
                // todo -> continue here
            })



            let candidateKeys = []
            for(const attr of entity.attributes){
                const pos = entity.attributes.findIndex((a) => a.name == attr.name)
                if(attr.isDerivated){
                    const studentAttribute = studentRelation.attributes.find((a) => a.name == attr.name)
                    if (studentAttribute != null){
                        return {isCorrect: false, errors: [messages.DERIVATE_ATTRIBUTE_INCLUDED.es]}
                    }
                    entity.attributes.splice(pos,1)
                }
                else if (attr.isMultivalued) continue
                else if (attr.isKey && (attr.subattributes == null || attr.subattributes.length == 0)){
                    const studentAttribute = studentRelation.attributes.find((a) => a.name == attr.name)
                    if (studentAttribute != null){
                        return {isCorrect: false, errors: [messages.MISSING_KEY_ATTRIBUTE.es]}
                    }
                    relation.attributes.push({name: attr.name})
                    candidateKeys.push([attr])
                    entity.attributes.splice(pos,1)
                }
                else if (attr.isKey && (attr.subattributes != null && attr.subattributes.length > 0)){
                    const subattributes = Mapper.getLeafAttributes(attr)
                    candidateKeys.push(subattributes)
                    for(const sa of subattributes){
                        const studentAttribute = studentRelation.attributes.find((a) => a.name == sa.name)
                        if (studentAttribute == null){
                            return {isCorrect: false, errors: [messages.MISSING_SUBATTRIBUTE_PART_OF_KEY.es]}
                        }
                        relation.attributes.push({name: sa.name})
                    }
                    entity.attributes.splice(pos,1)
                }
                else if (attr.subattributes != null && attr.subattributes.length > 0){
                    for(const sub of attr.subattributes) entity.attributes.push(sub)
                    entity.attributes.splice(pos,1)
                }
                else if (!attr.isPartialKey){
                    const studentAttribute = studentRelation.attributes.find((a) => a.name == attr.name)
                    if (studentAttribute == null){
                        return {isCorrect: false, errors: [messages.MISSING_REGULAR_ATTRIBUTE.es]}
                    }
                    relation.attributes.push({name: attr.name})
                    entity.attributes.splice(pos,1)
                }
            }
            
            if(candidateKeys.length == 1){
                for(const pkA of candidateKeys[0]){
                    const pkAttr = relation.attributes.find((a) => a.name == pkA.name)
                    pkAttr.isPK = true
                    const studentAttr = studentRelation.attributes.find((a) => a.name == pkA.name)
                    if (!studentAttr.isPK){
                        return {isCorrect: false, errors: [messages.MISSING_ATTRIBUTE_IN_PK.es]}
                    }
                }                
            }
            else if(candidateKeys.length > 1){
                // todo
                // follow student decision
            }

            if (entity.attributes.length == 0){
                baseER.entities.splice(relPos,1)
            }


            // end copy



        }
        
        return null*/
/*
        return null
    }

    static mapMultivaluedAttributes (baseER, studentRelational, runningRelational) {
        
        for(const entity of baseER.entities){
            const multivaluedAttrs = entity.attributes.filter((a) => a.isMultivalued)
            if (multivaluedAttrs.length == 0) continue
            const entityTable = runningRelational.relations.find((r) => r.name == entity.name)
            if (entityTable == null) continue
            const pkAttributes = entityTable.attributes.filter((a) => a.isPK)
            if (pkAttributes.length == 0) continue
            
            for(const multi of multivaluedAttrs) {
                const relation = {
                    name: multi.name,
                    attributes: [],
                    fks: []
                }
                runningRelational.relations.push(relation) 

                const studentRelation = studentRelational.relations.find((r) => r.name == multi.name)
                if (studentRelation == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_MULTIVALUED_RELATION', [multi.name, multi.name])}
                }

                for (const a of pkAttributes) {
                    const studentAttr = studentRelation.attributes.find((sAt) => sAt.name == a.name)
                    if (studentAttr == null){
                        return {isCorrect: false, message: Mapper.msg('MISSING_MULTIVALUED_RELATION_ENTITY_PK_ATTRIBUTE', [multi.name, a.name, entity.name])}
                    }
                    if (!studentAttr.isPK){
                        return {isCorrect: false, message: Mapper.msg('MISSING_MULTIVALUED_RELATION_ENTITY_PK', [multi.name, a.name])}
                    }
                    relation.attributes.push({name: a.name, isPK: true})
                }

                relation.fks.push({
                    targetRelation: entity.name,
                    attributes: pkAttributes.map((a) => a.name)
                })

                const fk = studentRelation.fks.find((f) => {
                    if (f.targetRelation != entity.name) return false
                    if (f.attributes.length != pkAttributes.length) return false
                    const differentAttr = pkAttributes.map((a) => a.name).find((a) => f.attributes.indexOf(a) == -1)
                    return differentAttr == null
                })

                if (fk == null){
                    return {isCorrect: false, message: Mapper.msg('WRONG_MULTIVALUED_FK', [multi.name, entity.name])}
                }

                const getRegularLeafAttributes = (multivaluedAttribute) => {
                    let leaves = []
                    if (multivaluedAttribute.subattributes == null || multivaluedAttribute.subattributes.length == 0){
                        return [multivaluedAttribute]
                    }
                    for(const ma of multivaluedAttribute.subattributes) {
                        if(ma.isDerivated) continue
                        // todo -> tener en cuenta otros tipos de atributos, viendo qué es posible y qué no
                        leaves = leaves.concat(getRegularLeafAttributes(ma))
                    }
                    return leaves
                }

                const regularAttributes = getRegularLeafAttributes(multi)

                for (const ra of regularAttributes) {
                    relation.attributes.push({
                        name: ra.name,
                        isPK: true
                    })

                    const studentAttr = studentRelation.attributes.find((a) => a.name == ra.name)
                    if (studentAttr == null){
                        return {isCorrect: false, message: Mapper.msg('MISSING_MULTIVALUED_ATTRIBUTE_IN_RELATION', [multi.name, ra.name])}
                    }
                    if (!studentAttr.isPK){
                        return {isCorrect: false, message: Mapper.msg('MISSING_MULTIVALUED_ATTRIBUTE_IN_RELATION_PK', [multi.name, ra.name])}
                    }
                }

                const multiAttrPos = entity.attributes.findIndex((a) => a.name == multi.name)
                entity.attributes.splice(multiAttrPos,1)

                if (entity.attributes.length == 0){
                    const entityPos = baseER.entities.findIndex((e) => e.name == entity.name)
                    baseER.entities.splice(entityPos,1)
                }                
            } 
        }
        return null
    }

    static mapRelationships (baseER, studentRelational, runningRelational) {
        let result
        for(const rel of baseER.relationships){
            if (rel.participants.length > 2){
                result = Mapper.mapNAryRelationships(baseER, studentRelational, runningRelational, rel)
                if (result != null) return result
                continue
            }   
            const card1 = rel.participants[0].maxCardinality
            const card2 = rel.participants[1].maxCardinality
            if (card1 == '1' && card2 == '1'){
                result = Mapper.map11Relationship(baseER, studentRelational, runningRelational, rel)
                if (result != null) return result
                continue
            }
            else if (card1 == '1' && card2 == 'N'){
                result = Mapper.map1NRelationship(baseER, studentRelational, runningRelational, rel)
                if (result != null) return result
                continue
            } 
            else {
                result = Mapper.mapMNRelationship(baseER, studentRelational, runningRelational, rel)
                if (result != null) return result
                continue
            }
        }
        return null
    }

    static mapRelationshipAttributes (baseER, studentRelational, runningRelational, relationship, targetRelation) {
        // todo
        // todo -> gestionar atributos del vínculo
            /*
            let i = 0
            while (relationship.attributes.length > 0){
                // todo -> gestionar diferentes tipos de atributos: derivados, multivaluados, compuestos
                
                const attr = studentRelWithFK.attributes.find((sa) => (sa.checked == null || sa.checked == false) && a.name == sa.name)
                if (attr == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_RELATIONSHIP_ATTR',[relationship.label, studentRelWithFK.name, a.name])}
                }

            }
            */
 /*       return null
    }

    // todo -> falta terminar
    static mapNAryRelationships (baseER, studentRelational, runningRelational, relationship){
        const pos = baseER.relationships.find((r) => r == relationship)
        const relations = []
        for (const p of relationship.participants){
            const r = runningRelational.relations.find((r) => r.name == p.entityName)
            if (r == null) return null // todavía no se ha transformado
            relations.push(r)
        }

        const pkRelations = []
        for(const r of relations){
            const pkR = r.attributes.filter((a) => a.isPK)
            if (pkR == null || pkR.length == 0) return null // todavía no se ha definido la PK
            pkRelations.push(pkR)
        }

        const candidateKeys = []

        const maxCard1Participants = relationship.participants.filter((p) => p.maxCardinality == '1')
        if (maxCard1Participants.length == 0){
            candidateKeys.push(pkRelations.flat())
        } 
        else {
            for(const m of maxCard1Participants){
                const partRelPos = relations.findIndex((r) => r.name == m.entityName)
                candidateKeys.push([pkRelations[partRelPos]])
            }
        }

        const studentNaryRelation = studentRelational.relations.find((r) => r.name == relationship.label)
        if (studentNaryRelation == null){
            return {isCorrect: false, message: Mapper.msg('MISSING_NARY_RELATION',[relationship.label])}
        }

        const runningRelation = {
            name: relationship.label,
            attributes: [],
            fks: []
        }
        runningRelational.relations.push(runningRelation)

        for(let i=0;i<pkRelations.length;i++){
            const r = relations[i]
            const pkAttrs = pkRelations[i]
            for(const a of pkAttrs){
                const regExp = new RegExp(a.name+"'*")
                const attr = studentNaryRelation.attributes.find((at) => regExp.test(at.name))
                if (attr == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_NARY_RELATION_ATTRIBUTE',[relationship.label, a.name, r.name])}
                }
                runningRelation.attributes.push({
                    name: a.name
                })
            }
        }

        for(let i=0;i<pkRelations.length;i++){
            const r = relations[i]
            const pkAttrs = pkRelations[i]
            const studentFK = studentNaryRelation.fks.find((fk) => fk.targetRelation == r.name && (fk.checked == null || fk.checked == false))
            if (studentFK == null) {
                return {isCorrect: false, message: Mapper.msg('MISSING_NARY_RELATION_FK',[relationship.label, r.name])}
            }

            for (const a of pkAttrs){
                const regExp = new RegExp(a.name+"'*")
                const fkAttr = studentFK.attributes.find((fkAttr) => regExp.test(fkAttr))
                if (fkAttr == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_NARY_RELATION_FK_ATTRIBUTES',[relationship.label, r.name, a.name])}
                }
            }
            if (studentFK.attributes.length != pkAttrs.length){
                return {isCorrect: false, message: Mapper.msg('MORE_NARY_RELATION_FK_ATTRIBUTES',[studentNaryRelation.name, r.name])}
            }
            studentFK.checked = true

            runningRelation.fks.push({
                targetRelation: r.name,
                attributes: pkAttrs.map((a) => a.name)
            })
        }

        // todo -> gestionar claves candidatas


        
        let result = Mapper.mapRelationshipAttributes(baseER, studentRelational, runningRelational, relationship, studentNaryRelation)
        if (result != null) return result
        baseER.relationships.splice(pos,1)
        return null
    }

    static map11Relationship (baseER, studentRelational, runningRelational, relationship){
        const pos = baseER.relationships.find((r) => r == relationship)
        const minCard1 = relationship.participants[0].minCardinality
        const minCard2 = relationship.participants[1].minCardinality
        let participantWithFK, participantNoFK
        if (minCard1 == '1' && minCard2 == '0'){ // la fk sí o sí en el participante 1
            participantWithFK = 0
            participantNoFK = 1
        }
        else if (minCard1 == '0' && minCard2 == '1'){ // la fk sí o sí en el participante 2
            participantWithFK = 1
            participantNoFK = 0
        }

        if (minCard1 != minCard2){
            const relWithFK = runningRelational.relations.find((r) => r.name == relationship.participants[participantWithFK].entityName)
            const relNoFK = runningRelational.relations.find((r) => r.name == relationship.participants[participantNoFK].entityName)
            const studentRelWithFK = studentRelational.relations.find((r) => r.name == relationship.participants[participantWithFK].entityName)
            const studentRelNoFK = studentRelational.relations.find((r) => r.name == relationship.participants[participantNoFK].entityName)

            if (relWithFK == null || relNoFK == null) return null // todavía no se ha transformado alguna de las relaciones participantes

            const pkRelNoFK = relNoFK.attributes.filter((a) => a.isPK)
            if (pkRelNoFK == null || pkRelNoFK.length == 0) return null // la relación a referenciar todavía no tiene PK


            for (const a of pkRelNoFK){
                const regExp = new RegExp(a.name+"'*")
                const attr = studentRelWithFK.attributes.find((sa) => (sa.checked == null || sa.checked == false) && regExp.test(sa.name))
                if (attr == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_FK_ATTR',[relationship.label, studentRelWithFK.name, a.name, studentRelNoFK.name])}
                }
                relWithFK.attributes.push({name: attr.name})
                attr.checked = true
            }

            const studentFK = studentRelWithFK.fks.find((fk) => (fk.checked == null || fk.checked == false) && fk.targetRelation == studentRelNoFK.name)
            if (studentFK == null){
                return {isCorrect: false, message: Mapper.msg('MISSING_FK',[studentRelWithFK.name, studentRelNoFK.name, relationship.label])}
            }
            for (const a of pkRelNoFK){
                const regExp = new RegExp(a.name+"'*")
                const fkAttr = studentFK.attributes.find((fkAttr) => regExp.test(fkAttr))
                if (fkAttr == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_ATTR_IN_FK',[studentRelWithFK.name, studentRelNoFK.name, a.name])}
                }
            }
            if (studentFK.attributes.length != pkRelNoFK.length){
                return {isCorrect: false, message: Mapper.msg('MORE_ATTR_IN_FK',[studentRelWithFK.name, studentRelNoFK.name])}
            }

            let result = Mapper.mapRelationshipAttributes(baseER, studentRelational, runningRelational, relationship, relWithFK)
            if (result != null) return result
        }
        else { // ver qué ha hecho el alumno
            // todo!!!

        }
        baseER.relationships.splice(pos,1)
        return null
    }

    // done!
    static map1NRelationship (baseER, studentRelational, runningRelational, relationship){
        const pos = baseER.relationships.find((r) => r == relationship)
        const maxCard1 = relationship.participants[0].maxCardinality
        const maxCard2 = relationship.participants[1].maxCardinality
        let participantWithFK, participantNoFK
        if (maxCard1 == '1' && maxCard2 == 'N'){
            participantWithFK = 0
            participantNoFK = 1
        }
        else {
            participantWithFK = 1
            participantNoFK = 0
        }

        const relWithFK = runningRelational.relations.find((r) => r.name == relationship.participants[participantWithFK].entityName)
        const relNoFK = runningRelational.relations.find((r) => r.name == relationship.participants[participantNoFK].entityName)
        const studentRelWithFK = studentRelational.relations.find((r) => r.name == relationship.participants[participantWithFK].entityName)
        const studentRelNoFK = studentRelational.relations.find((r) => r.name == relationship.participants[participantNoFK].entityName)

        if (relWithFK == null || relNoFK == null) return null // todavía no se ha transformado alguna de las relaciones participantes

        const pkRelNoFK = relNoFK.attributes.filter((a) => a.isPK)
        if (pkRelNoFK == null || pkRelNoFK.length == 0) return null // la relación a referenciar todavía no tiene PK

        for (const a of pkRelNoFK){
            const regExp = new RegExp(a.name+"'*")
            const attr = studentRelWithFK.attributes.find((sa) => (sa.checked == null || sa.checked == false) && regExp.test(sa.name))
            if (attr == null){
                return {isCorrect: false, message: Mapper.msg('MISSING_FK_ATTR',[relationship.label, studentRelWithFK.name, a.name, studentRelNoFK.name])}
            }
            relWithFK.attributes.push({name: attr.name})
            attr.checked = true
        }

        const studentFK = studentRelWithFK.fks.find((fk) => (fk.checked == null || fk.checked == false) && fk.targetRelation == studentRelNoFK.name)
        if (studentFK == null){
            return {isCorrect: false, message: Mapper.msg('MISSING_FK',[studentRelWithFK.name, studentRelNoFK.name, relationship.label])}
        }
        for (const a of pkRelNoFK){
            const regExp = new RegExp(a.name+"'*")
            const fkAttr = studentFK.attributes.find((fkAttr) => regExp.test(fkAttr))
            if (fkAttr == null){
                return {isCorrect: false, message: Mapper.msg('MISSING_ATTR_IN_FK',[studentRelWithFK.name, studentRelNoFK.name, a.name])}
            }
        }
        if (studentFK.attributes.length != pkRelNoFK.length){
            return {isCorrect: false, message: Mapper.msg('MORE_ATTR_IN_FK',[studentRelWithFK.name, studentRelNoFK.name])}
        }

        let result = Mapper.mapRelationshipAttributes(baseER, studentRelational, runningRelational, relationship, relWithFK)
        if (result != null) return result
        baseER.relationships.splice(pos,1)
        return null
    }

    // done
    static mapMNRelationship (baseER, studentRelational, runningRelational, relationship){
        const pos = baseER.relationships.find((r) => r == relationship)
        const relPart1 = runningRelational.relations.find((r) => r.name == relationship.participants[0].entityName)
        const relPart2 = runningRelational.relations.find((r) => r.name == relationship.participants[1].entityName)

        if (relPart1 == null || relPart2 == null) return null // todavía no se ha transformado

        const pkRelPart1 = relPart1.attributes.filter((a) => a.isPK)
        const pkRelPart2 = relPart2.attributes.filter((a) => a.isPK)
        
        if (pkRelPart1 == null || pkRelPart1.length == 0 || pkRelPart2 == null || pkRelPart2.length == 0) return null // alguna de las relaciones todavía no tiene PK

        const studentRelRelation = studentRelational.relations.find((r) => r.name == relationship.label)

        if (studentRelRelation == null){
            return {isCorrect: false, message: Mapper.msg('MISSING_MN_RELATION',[relationship.label])}
        }
        const runningRelRelation = {
            name: relationship.label,
            attributes: [],
            fks: []
        }
        runningRelational.relations.push(runningRelRelation)

        for(const a of pkRelPart1){
            const regExp = new RegExp(a.name+"'*")
            const studentAttr = studentRelRelation.attributes.find((at) => regExp.test(at.name))
            if (studentAttr == null){
                return {isCorrect: false, message: Mapper.msg('MISSING_MN_RELATION_ATTRIBUTE',[relationship.label, relPart1.name, a.name])}
            }
            if (!studentAttr.isPK){
                return {isCorrect: false, message: Mapper.msg('MISSING_ATTRIBUTE_IN_MN_RELATION_PK',[relationship.label, a.name])}
            }
            const runningAttr = {
                name: a.name,
                checked: true
            }
            runningRelRelation.attributes.push(runningAttr)
        }

        for(const a of pkRelPart2){
            const regExp = new RegExp(a.name+"'*")
            const studentAttr = studentRelRelation.attributes.find((at) => regExp.test(at.name))
            if (studentAttr == null){
                return {isCorrect: false, message: Mapper.msg('MISSING_MN_RELATION_ATTRIBUTE',[relationship.label, relPart2.name, a.name])}
            }
            if (!studentAttr.isPK){
                return {isCorrect: false, message: Mapper.msg('MISSING_ATTRIBUTE_IN_MN_RELATION_PK',[relationship.label, a.name])}
            }
            const runningAttr = {
                name: a.name,
                checked: true,
                isPK: true
            }
            runningRelRelation.attributes.push(runningAttr)
        }

        const fk1 = studentRelRelation.fks.find((fk) => {
            if (fk.checked != null && fk.checked == true) return false
            if (fk.targetRelation != relPart1.name) return false
            return true
        })
        if (fk1 == null){
            return {isCorrect: false, message: Mapper.msg('MISSING_MN_RELATION_FK',[relationship.label, relPart1.name])}
        } 
        else {
            for (const fkAttr of pkRelPart1){
                const fkA = fk1.attributes.find((f) => f == fkAttr.name)
                if (fkA == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_MN_RELATION_FK_ATTRIBUTE',[relationship.label, relPart1.name, fkAttr.name])}
                }
            }
            if (fk1.attributes.length > pkRelPart1.length){
                return {isCorrect: false, message: Mapper.msg('MORE_MN_RELATION_FK_ATTRIBUTES',[relationship.label, relPart1.name])}
            }
            const fk = {
                attributes: pkRelPart1.map((a) => a.name),
                targetRelation: relPart1.name,
                checked: true
            }
            runningRelRelation.fks.push(fk)
        }

        const fk2 = studentRelRelation.fks.find((fk) => {
            if (fk.checked != null && fk.checked == true) return false
            if (fk.targetRelation != relPart2.name) return false
            return true
        })
        if (fk2 == null){
            return {isCorrect: false, message: Mapper.msg('MISSING_MN_RELATION_FK',[relationship.label, relPart2.name])}
        } 
        else {
            for (const fkAttr of pkRelPart2){
                const fkA = fk2.attributes.find((f) => f == fkAttr.name)
                if (fkA == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_MN_RELATION_FK_ATTRIBUTE',[relationship.label, relPart2.name, fkAttr.name])}
                }
            }
            if (fk2.attributes.length > pkRelPart2.length){
                return {isCorrect: false, message: Mapper.msg('MORE_MN_RELATION_FK_ATTRIBUTES',[relationship.label, relPart2.name])}
            }
            const fk = {
                attributes: pkRelPart2.map((a) => a.name),
                targetRelation: relPart2.name,
                checked: true
            }
            runningRelRelation.fks.push(fk)
        }

        let result = Mapper.mapRelationshipAttributes(baseER, studentRelational, runningRelational, relationship, studentRelRelation)
        if (result != null) return result
        baseER.relationships.splice(pos,1)
        return null
    }
    static mapSpecializations(baseER, studentRelational, runningRelational) {
    for (let i = baseER.specializations.length - 1; i >= 0; i--) {
        const spec = baseER.specializations[i];
        
        // 1. Buscamos la superclase (Madre) ya mapeada
        const superRelation = runningRelational.relations.find(r => r.name === spec.superclassEntityName);
        if (!superRelation) continue; 
        
        const superPK = superRelation.attributes.filter(a => a.isPK);
        if (superPK.length === 0) continue;

        // 2. Procesamos cada subclase (B, C, etc.)
        for (const subName of spec.subclassEntityNames) {
            if (runningRelational.relations.find(r => r.name === subName)) continue;

            const studentSubRel = studentRelational.relations.find(r => r.name === subName);
            if (!studentSubRel) return { isCorrect: false, message: Mapper.msg('MISSING_RELATION', [subName]) };

            const runningSubRel = { name: subName, attributes: [], fks: [] };

            // 3. Validar Herencia de Clave Primaria
            for (const pkAttr of superPK) {
                const studentAttr = studentSubRel.attributes.find(a => a.name === pkAttr.name);
                if (!studentAttr || !studentAttr.isPK) {
                    return { isCorrect: false, message: Mapper.msg('MISSING_ATTRIBUTE_IN_PK', [pkAttr.name, subName]) };
                }
                runningSubRel.attributes.push({ name: pkAttr.name, isPK: true });
            }

            // 4. Validar Clave Foránea (FK)
            const studentFK = studentSubRel.fks.find(f => f.targetRelation === spec.superclassEntityName);
            if (!studentFK) return { isCorrect: false, message: Mapper.msg('MISSING_FK', [subName, spec.superclassEntityName, "Especialización"]) };
            runningSubRel.fks.push({ targetRelation: spec.superclassEntityName, attributes: superPK.map(a => a.name) });

            // 5. ATRIBUTOS PROPIOS (Aquí es donde se valida C1, C2, B1, B2...)
            const subEntityInER = baseER.entities.find(e => e.name === subName);
            if (subEntityInER) {
                // Iteramos por los atributos que tiene la entidad en el diagrama ER
                for (let k = subEntityInER.attributes.length - 1; k >= 0; k--) {
                    const attr = subEntityInER.attributes[k];
                    
                    // Si es la clave (que ya heredamos), la quitamos y seguimos
                    if (attr.isKey) {
                        subEntityInER.attributes.splice(k, 1);
                        continue;
                    }

                    // Buscamos el atributo (ej: C2) en la tabla del alumno
                    const studentAttr = studentSubRel.attributes.find(a => a.name === attr.name);
                    if (!studentAttr) {
                        return { isCorrect: false, message: Mapper.msg('MISSING_REGULAR_ATTRIBUTE', [attr.name, subName]) };
                    }
                    
                    // Si existe, lo añadimos a nuestra relación de control y lo borramos del ER
                    runningSubRel.attributes.push({ name: attr.name });
                    subEntityInER.attributes.splice(k, 1);
                }

                // Si la entidad se queda sin atributos, la borramos del ER para que el bucle avance
                if (subEntityInER.attributes.length === 0) {
                    const entIdx = baseER.entities.findIndex(e => e.name === subName);
                    baseER.entities.splice(entIdx, 1);
                }
            }
            runningRelational.relations.push(runningSubRel);
        }

        // Al terminar todas las subclases de esta jerarquía, la eliminamos
        baseER.specializations.splice(i, 1);
    }
    return null;
}
  
    static mapCategories (baseER, studentRelational, runningRelational) {
        for(const cat of baseER.categories){
            const catName = cat.categoryEntityName
            const superNames = cat.superclassEntityNames
            const type = cat.type || 'U'
            const isTtal=cat.isTotal
            
            const catRel = studentRelational.relations.find(r=> r.name==catName)
            
            //existe categoria
            if(catRel == null){
                return {isCorrect:false, message: Mapper.msg('MISSIN_CATEGORY_RELATION', [catName])}
            }
            
            //obtener superclases y sus PK
            const superRels=[]
            
            for(const superName of superNames){
                const superRel=studentRelational.relations.find(r => r.name == superName)
                if(superRel ==null){
                    return {isCorrect:false, message:Mapper.msg('MISSING_SUPERCLASS_RELATION', [superName])}
                }
                
                const superPK = superRel.attributes.filter(a => a.isPK)
                
                if(superPK.length == 0){
                    return {isCorrect:false, message:Mapper.msg('MISSING_PK', [superName])}
                }
                
                superRels.push({name:superName, pk: superPK})
            }
            
            //PK de la categoria
            const catPK = catRel.attributes.filter(a=> a.isPK)
            
            if(catPK.length == 0){
                 return {isCorrect:false, message: Mapper.msg('MISSING_PK', [catName])}
            }
            
            
            //diferencias c,d,u
            let validPK = false
            if(type=='U'){
                for (const superRel of superRels){
                    const match = superRel.pk.every(pkAttr => catPK.find(a => a.name == pkAttr.name) != null) && superRel.pk.length == catPK.length
                    
                    if(match){
                        validPK = true
                        break
                    }
                }
                if (!validPK){
                     return {isCorrect:false, message:Mapper.msg('WRONG_PK', [catName])}   
                }
            }
            
            else if (type=='D'){
                let matchCount =0
                for(const superRel of superRels){
                    const match = superRel.pk.every(pkAttr => catPK.find(a => a.name == pkAttr.name) != null) && superRel.pk.length == catPK.length
                    if(match){
                        matchCount++
                    }
                }
                if(matchCount !==1){
                    return{
                        isCorrect:false,
                        message: Mapper.msg('CATEGORY_DISJOINT_ERROR', [catName])
                    }
                }
                validPK=true
            }
            else if(type=='C'){
                //deben incluir todas las PKs
                const allPK = superRels.flatMap(s=> s.pk)
                
                const match = allPK.every(pkAttr => catPK.find (a => a.name == pkAttr.name) !=null)
                
                if(!match || catPK.length != allPK.length){
                    return{
                        isCorrect:false,
                        message: Mapper.msg('CATEGORY_COMMON_ERROR', [catName])
                    }
                }
                
                validPK = true
            }
            
            //validar FK
            let fkCount=0
            
            for(const superRel of superRels){
                const fk = catRel.fks.find(fk => fk.targetRelation == superRel.name)
                
                if(fk){
                    fkCount++
                    for(const pkAttr of superRel.pk){
                        if(!fk.attributes.includes(pkAttr.name)){
                            return{
                                isCorrect:false,
                                message:Mapper.msg('WRONG_FK_IN_CATEGORY', [catName, pkAttr.name])
                            }
                        }
                    }
                }
            }
            
            //segun el tipo
            if(type =='D' && fkCount>1){
               return{
                   isCorrect:false,
                   message: Mapper.msg('CATEGORY_DISJOINT_FK_ERROR', [catName])
               }
            }
            if(type =='C' && fkCount!= superRels.length){
               return{
                   isCorrect:false,
                   message: Mapper.msg('CATEGORY_COMMON_FK_ERROR', [catName])
               }
            }
            
            if(type =='U' && fkCount==0){
               return{
                   isCorrect:false,
                   message: Mapper.msg('CATEGORY_UNION_FK_ERROR', [catName])
               }
            }
            
            //total o parcial
            if(isTotal){
                //debe haber FK
                if(fkCount ==0){
                    return {
                      isCorrect:false,
                      message: Mapper.msg('CATEGORY_TOTAL_ERROR', [catName])
                    }
                }
            }
            
            //eliminar categoria
            
            const pos = baseER.categories.indexOf(cat)
            baseER.categories.splice(pos,1)
            
        }
        return null
    }
}

export {Mapper}
*/

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
                isDerivated: true/false,
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
            name...
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
        type: 'C' | 'D' |'U'
    }

]
}

*/

/*

{
    relations: [
        {
            name: X,
            attributes: [
                {
                    name: X,
                    isPK: true/false
                }, ...
            ]
            fks: [
                {
                    targetRelation: X,
                    attributes: [X, Y, ...]
                }
            ]
        }, ...
    ]
}

*/


