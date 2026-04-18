import {messages} from "./messages.js"

class Mapper {
    static checkSolution (baseER0, studentRelational) {
        try {
            
            const baseER = JSON.parse(JSON.stringify(baseER0))
            let result
            const runningRelational = { relations: [] }
            let safety = 0; 

            while((baseER.entities.length > 0 || baseER.relationships.length > 0 || baseER.specializations.length > 0 || baseER.categories.length > 0) && safety < 100){
                safety++;
                let totalBefore = baseER.entities.length + baseER.relationships.length + baseER.specializations.length + baseER.categories.length;
                
                result = Mapper.mapMultivaluedAttributes(baseER, studentRelational, runningRelational)
                if (result != null) return result

                result = Mapper.mapStrongEntities(baseER, studentRelational, runningRelational)
                if (result != null) return result
                
                result = Mapper.mapWeakEntities(baseER, studentRelational, runningRelational)
                if (result != null) return result
                                               
                result = Mapper.mapRelationships(baseER, studentRelational, runningRelational)
                if (result != null) return result
                                
                result = Mapper.mapSpecializations(baseER, studentRelational, runningRelational)
                if (result != null) return result
                
                result = Mapper.mapCategories(baseER, studentRelational, runningRelational)
                if (result != null) return result

                let totalAfter = baseER.entities.length + baseER.relationships.length + baseER.specializations.length + baseER.categories.length;
                
                if (totalBefore === totalAfter) {
                    return {isCorrect: false, message: "La solución está incompleta o hay elementos mal definidos."}
                }
            }

            
    

            // Recorremos todas las tablas que el alumno dibujó
            for (const sTable of studentRelational.relations) {
                // 1. ¿Esta tabla existe en el modelo aprobado?
                const isTableValid = runningRelational.relations.some(r => r.name === sTable.name);
                if (!isTableValid) {
                    return { 
                        isCorrect: false, 
                        message: `ERROR: La tabla '${sTable.name}' no debería existir en este modelo.` 
                    };
                }
                // 2. Verificar atributos inventados 
                for (const sAttr of sTable.attributes) {
                    if (!sAttr.isValidated) {
                        return { 
                            isCorrect: false, 
                            message: `ERROR: El atributo '${sAttr.name}' en la tabla '${sTable.name}' no pertenece al modelo o está mal ubicado.` 
                        };
                    }
                }

                // 3. Verificar relaciones/flechas inventadas
                if (sTable.fks) {
                    for (const sFK of sTable.fks) {
                        if (!sFK.isValidated) {
                            return { 
                                isCorrect: false, 
                                message: `ERROR: La relación hacia '${sFK.targetRelation}' en la tabla '${sTable.name}' no es correcta.` 
                            };
                        }
                    }
                }
            }

            // Si llega aquí, es que no hay "basura"
            return {isCorrect: true, message: "¡PERFECTO!!"}

            // SI SALE DEL BUCLE PORQUE TODO SE HA BORRADO
          /*  if (safety < 100) {
                return {isCorrect: true, message: "¡PERFECTO!!"}
            } else {
                return {isCorrect: false, message: "Error: Se ha alcanzado el límite de intentos (Bucle detectado)."}
            }*/

        } catch (error) {
            console.error(error);
            return {isCorrect: false, message: "Error crítico en el Mapper: " + error.message};
        }
    }

   
    static getRelationPK (runningRelational, relationName) {
        const rel = runningRelational.relations.find((r) => r.name === relationName)
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

    static mapStrongEntities(baseER, studentRelational, runningRelational) {
        // Recorremos las entidades de atrás hacia adelante para poder usar splice con seguridad
        for (let i = baseER.entities.length - 1; i >= 0; i--) {
            const entity = baseER.entities[i];
            const studentTable = studentRelational.relations.find(r => r.name === entity.name);

            // Si el alumno aún no ha dibujado la tabla, no podemos validarla todavía
            if (!studentTable) continue; 
            
        // --- CAMBIO AQUÍ: Si es débil (isWeak: true), NO la procesamos como fuerte ---
        if (entity.isWeak) continue; 
        
        
            // Validamos los atributos de la entidad
            for (const attr of entity.attributes) {
                
                // REGLA 1: Ignorar derivados (como A2) y multivaluados (van a otra tabla)
                if (attr.isDerivated || attr.isMultivalued) {
                    continue; 
                }

                // REGLA 2: Atributos Compuestos (como B3)
                if (attr.subattributes && attr.subattributes.length > 0) {
                    // El "padre" desaparece y buscamos a los "hijos" (B4, B5) directamente en la tabla
                    for (const sub of attr.subattributes) {
                        
                            const foundSub = studentTable.attributes.find(sa => sa.name === sub.name);
                            if (!foundSub) {
                                return { 
                                    isCorrect: false, 
                                    message: `ERROR: El sub-atributo '${sub.name}' debe estar en la tabla ${entity.name}.` 
                                };
                            }
                            
                            foundSub.isValidated = true; // <--- SELLO DE VALIDEZ
                            
                            if(attr.isKey && !foundSub.isPK){
                            
                                return { 
                                    isCorrect: false, 
                                    message: `ERROR: El atributo '${sub.name}' debe ser Clave Primaria porque su padre '${attr.name}' lo era.` 
                                };
                            }
                        
                    }
                } 
                // REGLA 3: Atributos Simples
                else {
                    const foundAttr = studentTable.attributes.find(sa => sa.name === attr.name);
                    if (!foundAttr) {
                        
                        return { 
                            isCorrect: false, 
                            message: `ERROR: Falta el atributo '${attr.name}' en la tabla ${entity.name}.` 
                        };
                    }else{
                        
                        
                        
                    // 1. Si es PK en el dibujo pero NO debería serlo según el ER
                        if (foundAttr.isPK && !attr.isKey) {
                            return { 
                                isCorrect: false, 
                                message: `ERROR: El atributo '${attr.name}' no forma parte de la Clave Primaria de '${entity.name}'.` 
                            };
                        }
                        

                        // Opcional: Validar si debe ser PK
                        if (attr.isKey && !foundAttr.isPK) {
                            return { 
                                isCorrect: false, 
                                message: `ERROR: El atributo '${attr.name}' debe ser clave primaria en la tabla ${entity.name}.` 
                            };
                        }
                        foundAttr.isValidated = true;
                    }
                }
            }    
          
            runningRelational.relations.push(studentTable);
            baseER.entities.splice(i, 1);
        }
        return null;
    }

    static mapWeakEntities(baseER, studentRelational, runningRelational) {
    for (let i = baseER.entities.length - 1; i >= 0; i--) {
        const entity = baseER.entities[i];
        
        // 1. Filtro: Solo si es débil en el JSON
        if (entity.isWeak !== true) continue;
     
        const studentTable = studentRelational.relations.find(r => r.name === entity.name);
        if (!studentTable) continue;

        const relacionesIdentificadoras = baseER.relationships.filter(r => 
            r.isIdentifier === true && r.participants.some(p => p.entityName === entity.name)
        );

        if (relacionesIdentificadoras.length === 0) continue;

        // 3. Validamos cada relación identificadora (Herencia de PK y existencia de FK)
        let listasParaBorrar = [];
        let faltanFuertes = false;
        
        // 2. Para cada relación, obligamos a que su FK esté en la PK de la débil
        for (const rel of relacionesIdentificadoras) {
            const pFuerte = rel.participants.find(p => p.entityName !== entity.name);
            const runningFuerte = runningRelational.relations.find(r => r.name === pFuerte.entityName);

            if (!runningFuerte) {
                faltanFuertes = true;
                break;
            }
            const pksFuerte = runningFuerte.attributes.filter(a => a.isPK);

            // VALIDAR ATRIBUTOS HEREDADOS
            for (const pk of pksFuerte) {
                const found = studentTable.attributes.find(sa => sa.name === pk.name);
                if (!found || !found.isPK) {
                    return { 
                        isCorrect: false, 
                        message: `ERROR: El atributo heredado '${pk.name}' (de '${pFuerte.entityName}') debe ser PK en '${entity.name}'.` 
                    };
                }
                found.isValidated = true;
            }

            // VALIDAR FK (Lo que pedías)
            const tieneFK = studentTable.fks.find(f => f.targetRelation === pFuerte.entityName);
            if (!tieneFK) {
                return { 
                    isCorrect: false, 
                    message: `ERROR: Falta la relación (FK) de '${entity.name}' apuntando a '${pFuerte.entityName}'.` 
                };
            }
            tieneFK.isValidated = true;
            listasParaBorrar.push(rel);
        }
        
                
        // B. Validar los atributos propios (A1 y A2)
        for (const attr of entity.attributes) {
            if (attr.isDerivated || attr.isMultivalued) continue;

            const foundAttr = studentTable.attributes.find(sa => sa.name === attr.name);
            if (!foundAttr) {
                return { isCorrect: false, message: `ERROR: Falta el atributo '${attr.name}' en la tabla '${entity.name}'.` };
            }
            foundAttr.isValidated = true;

            // Si es el discriminador (A1), ¡OBLIGATORIO ser PK!
            if (attr.isPartialKey === true && !foundAttr.isPK) {
                return { 
                    isCorrect: false, 
                    message: `ERROR: La clave '${attr.name}' debe ser Clave Primaria (PK) en '${entity.name}'.` 
                };
            }
        }

        
        runningRelational.relations.push(studentTable);
        baseER.entities.splice(i, 1);
        // Borramos todos los rombos identificadores procesados
        for (const rel of listasParaBorrar) {
            const idx = baseER.relationships.indexOf(rel);
            if (idx !== -1) baseER.relationships.splice(idx, 1);
        }
        
        return null;
    }
    return null;
}

   static mapMultivaluedAttributes(baseER, studentRelational, runningRelational) {
    for (const entity of baseER.entities) { // Miramos en las entidades que aún no se han borrado
        for (let i = entity.attributes.length - 1; i >= 0; i--) {
            const attr = entity.attributes[i];

            if (attr.isMultivalued) {
                // Buscamos la tabla que el alumno debe haber creado (B3)
                const studentTable = studentRelational.relations.find(r => r.name === attr.name);

                if (!studentTable) {
                    return { 
                        isCorrect: false, 
                        message: `ERROR: El atributo multivaluado '${attr.name}' debe tener su propia tabla` 
                    };
                }

                // VALIDACIÓN DE CLAVE COMPUESTA (B1 + B4 + B5)
                const entityPKName = entity.attributes.find(a => a.isKey).name; // B1
                
                // ¿Está la PK de la entidad (B1) en la tabla B3 y es PK?
                const hasEntityPK = studentTable.attributes.find(a => a.name === entityPKName && a.isPK);
                if (!hasEntityPK) {
                    return { isCorrect: false, message: `ERROR: La tabla '${attr.name}' debe incluir '${entityPKName}' como parte de su Clave Primaria.` };
                }
                
                hasEntityPK.isValidated=true;
                
                if (attr.subattributes && attr.subattributes.length >0) {
                    for (const sub of attr.subattributes) {
                        const foundSub = studentTable.attributes.find(a => a.name === sub.name);
                        if (!foundSub) {
                            return { 
                                isCorrect: false, 
                                message: `ERROR: Falta el atributo '${sub.name}' en la tabla '${attr.name}'.` 
                            };
                        }
                        // SI EL ALUMNO NO LO PUSO PK, LE AVISAMOS
                        if (!foundSub.isPK) {
                            return {
                                isCorrect: false,
                                message: `ERROR: El atributo '${sub.name}' debería ser Clave Primaria en la tabla '${attr.name}'.`
                            };
                        }
                        foundSub.isValidated=true;
                    }
                }else {
                    // Si es un multivaluado simple como A2
                    const foundAttr = studentTable.attributes.find(sa => sa.name === attr.name);
                    if (!foundAttr) {
                        return { 
                            isCorrect: false, 
                            message: `ERROR: Falta el atributo '${attr.name}' en su tabla.` 
                        };
                    }
                    
                    if (!foundAttr.isPK) {
                        return { 
                            isCorrect: false, 
                            message: `ERROR: El atributo '${attr.name}' debe ser PK en la tabla '${attr.name}'.` 
                        };
                    }
                    foundAttr.isValidated=true;
                }
                const tieneFK = studentTable.fks.find(f => f.targetRelation === entity.name);

                if (!tieneFK) {
                    return { 
                        isCorrect: false, 
                        message: `ERROR: La tabla del atributo multivaluado '${studentTable.name}' debe tener una FK hacia '${entity.name}'.` 
                    };
                }
                // Comprobamos que la flecha apunte a la PK de A y no otro cualquiera
               
                if (tieneFK.targetAttribute && tieneFK.targetAttribute !== entityPKName) {
                    return {
                        isCorrect: false,
                        message: `ERROR: La clave foránea de '${studentTable.name}' debe apuntar a la clave primaria '${entityPKName}', no a '${tieneFK.targetAttribute}'.`
                    };
                }
                tieneFK.isValidated=true;
                runningRelational.relations.push(studentTable);
                // Si todo está bien, borramos el atributo para que no lo pida en la tabla normal
                entity.attributes.splice(i, 1);
            }
        }
    }
    return null;
}

    static mapRelationships (baseER, studentRelational, runningRelational) {
        for (let i = baseER.relationships.length - 1; i >= 0; i--) {
            const rel = baseER.relationships[i];
            
            const roles = rel.participants;
            // Seguridad por si la relación no tiene participantes
            if (!roles || roles.length < 2) continue;
            const card1 = roles[0].maxCardinality;
            const card2 = roles[1].maxCardinality;
            let result = null;

            if (roles.length > 2) {
                result = Mapper.mapNAryRelationships(baseER, studentRelational, runningRelational, rel);
            } else if (card1 == '1' && card2 == '1') {
                result = Mapper.map11Relationship(baseER, studentRelational, runningRelational, rel);
            } else if ((card1 == '1' && card2 == 'N') || (card1 == 'N' && card2 == '1')) {
                result = Mapper.map1NRelationship(baseER, studentRelational, runningRelational, rel);
            } else {
                result = Mapper.mapMNRelationship(baseER, studentRelational, runningRelational, rel);
            }
            if (result != null) return result;

            // ¡ESTO ES LO QUE TE FALTA! Si no hay error, borramos el rombo del diagrama ER
            const index = baseER.relationships.indexOf(rel);
            baseER.relationships.splice(index, 1);
        }
        return null;
    }


    static mapRelationshipAttributes (baseER, studentRelational, runningRelational, relationship, targetRelation) {
        // Buscamos si el alumno puso el atributo del rombo en la tabla elegida
        for (let i = relationship.attributes.length - 1; i >= 0; i--) {
            const relAttr = relationship.attributes[i];
            const studentAttr = targetRelation.attributes.find(sa => sa.name === relAttr.name);

            if (!studentAttr) {
                return {
                    isCorrect: false,
                    message: `El atributo '${relAttr.name}' del vínculo '${relationship.label}' debe estar en la tabla ${targetRelation.name}.`
                };
            }
            studentAttr.isValidated=true;
            // Si está, lo quitamos de la lista de pendientes
            relationship.attributes.splice(i, 1);
        }
        return null;
    }


    static mapNAryRelationships (baseER, studentRelational, runningRelational, relationship){
        //const pos = baseER.relationships.find((r) => r == relationship)
        const pos = baseER.relationships.indexOf(relationship);
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
            //caso N:N:N
            candidateKeys.push(pkRelations.flat())
        } 
        else {
            //caso N:N:1
            for(const m of maxCard1Participants){
                const partRelPos = relations.findIndex((r) => r.name == m.entityName)
                candidateKeys.push(pkRelations[partRelPos])
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
        runningRelational.relations.push(studentNaryRelation);

        for(let i=0;i<pkRelations.length;i++){
            const r = relations[i]
            const pkAttrs = pkRelations[i]
            for(const a of pkAttrs){
                const regExp = new RegExp(a.name+"'*")
                const attr = studentNaryRelation.attributes.find((at) => regExp.test(at.name))
                if (attr == null){
                    return {isCorrect: false, message: Mapper.msg('MISSING_NARY_RELATION_ATTRIBUTE',[relationship.label, a.name, r.name])}
                }
                attr.isValidated=true;
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
            studentFK.isValidated=true;

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
        // --- TODO: GESTIONAR CLAVES CANDIDATAS (Validación de PK) ---
        const studentPKAttrs = studentNaryRelation.attributes.filter(a => a.isPK).map(a => a.name.toLowerCase());

        if (studentPKAttrs.length === 0) {
            return { isCorrect: false, message: `ERROR: La tabla '${relationship.label}' debe tener una Clave Primaria.` };
        }

        // Comprobamos si la PK del alumno coincide con alguna de nuestras candidatas
        const isAnyCandidateOK = candidateKeys.some(candidate => {
            if (candidate.length !== studentPKAttrs.length) return false;
            // Miramos si todos los atributos de la candidata están en la PK del alumno
            return candidate.every(cAttr => studentPKAttrs.includes(cAttr.name.toLowerCase()));
        });

        if (!isAnyCandidateOK) {
            return { 
                isCorrect: false, 
                message: `ERROR: La Clave Primaria de '${relationship.label}' no es correcta según las cardinalidades.` 
            };
        }


        
        let result = Mapper.mapRelationshipAttributes(baseER, studentRelational, runningRelational, relationship, studentNaryRelation)
        if (result != null) return result
        baseER.relationships.splice(pos,1);
        return null;
    }

    
 static map11Relationship(baseER, studentRelational, runningRelational, rel) {
    const p1 = rel.participants[0];
    const p2 = rel.participants[1];
    const ent1Name = p1.entityName;
    const ent2Name = p2.entityName;

    const isOptional = (p1.minCardinality === '0' || p2.minCardinality === '0');
    const isBothMandatory = (p1.minCardinality === '1' && p2.minCardinality === '1');
    
    const studentTable1 = studentRelational.relations.find(r => r.name === ent1Name);
    const studentTable2 = studentRelational.relations.find(r => r.name === ent2Name);

    // --- CASO PROPAGACIÓN (Págs 6 y 7) ---
    if (isOptional) {
        // Si faltan las tablas físicas en el dibujo, esperamos en silencio
        if (!studentTable1 || !studentTable2) return null;

        // Buscamos las tablas en la lista de "aprobadas"
        const running1 = runningRelational.relations.find(r => r.name === ent1Name);
        const running2 = runningRelational.relations.find(r => r.name === ent2Name);
        
        // Si las tablas base aún tienen errores (ej. falta PK propia), esperamos a que se arreglen
        if (!running1 || !running2) return null;

        const pk1 = running1.attributes.find(a => a.isPK);
        const pk2 = running2.attributes.find(a => a.isPK);

        // Comprobamos si el alumno ha movido alguna clave (usamos toLowerCase por seguridad)
        const pk1en2 = studentTable2.attributes.find(sa => sa.name.toLowerCase() === pk1.name.toLowerCase());
        const pk2en1 = studentTable1.attributes.find(sa => sa.name.toLowerCase() === pk2.name.toLowerCase());

        // 1. IDENTIFICAR DESTINO (Donde el alumno PUSO la clave o donde DEBERÍA estar)
        let tablaDestino = null;
        let nombreTablaOrigen = "";
        let fkEncontrada = null;

        if (p1.minCardinality === '0' && p2.minCardinality === '1') {
            tablaDestino = studentTable1; // Destino es la entidad con (1,1)
            nombreTablaOrigen = ent2Name;
            fkEncontrada = pk2en1; // Buscamos la clave de la opcional en la obligatoria
        } else if (p2.minCardinality === '0' && p1.minCardinality === '1') {
            tablaDestino = studentTable2;
            nombreTablaOrgien = ent1Name;
            fkEncontrada = pk1en2;
        } else {
            // Caso (0,1)-(0,1) - Página 7: Vale cualquiera, miramos dónde la puso
            if (pk1en2) {
                tablaDestino = studentTable2;
                nombreTablaOrigen = ent1Name;
                fkEncontrada = pk1en2;
            } else if (pk2en1) {
                tablaDestino = studentTable1;
                nombreTablaOrigen = ent2Name;
                fkEncontrada = pk2en1;
            }
        }

        // --- LAS VALIDACIONES DE ERROR ---
        
        // Si ya existen las tablas pero no hay rastro de la FK en ningún lado
        if (!pk1en2 && !pk2en1) {
            return { isCorrect: false, message: `La clave de la entidad (0,1) debe viajar a la tabla destino como FK.` };
        }
        
        if (fkEncontrada) {
            fkEncontrada.isValidated = true; // SELLO 1: El atributo FK es válido
        }
        
        // VALIDAR LA FK 
        const fkDefinida = tablaDestino.fks.find(f => f.targetRelation === nombreTablaOrigen);
        if (!fkDefinida) {
            return { 
                isCorrect: false, 
                message: `ERROR: Falta definir la Clave Foránea (FK) en '${tablaDestino.name}' apuntando a '${nombreTablaOrigen}'.` 
            };
        }
        fkDefinida.isValidated=true;

        // 2. VALIDAR ATRIBUTOS DEL ROMBO (R1)
        for (const relAttr of rel.attributes) {
            const hasAttr = tablaDestino.attributes.some(sa => sa.name.toLowerCase() === relAttr.name.toLowerCase());
            if (!hasAttr) {
                return { isCorrect: false, message: `ERROR: El atributo '${relAttr.name}' de la relación debe estar en la tabla '${nombreTablaOrigen}' junto a la FK.` };
            }
            hasAtrr.isValidated=true;
        }

        // 3. Validar que no sea PK
        if (fkEncontrada.isPK) {
            return { isCorrect: false, message: `ERROR: La clave foránea '${fkEncontrada.name}' no debe ser PK en '${nombreTablaOrigen}' (Págs 6-7).` };
        }

        // ÉXITO: Borrar rombo
        const relIdx = baseER.relationships.indexOf(rel);
        if (relIdx !== -1) baseER.relationships.splice(relIdx, 1);
        return null;
    }

    // --- ESCENARIO B: FUSIÓN (Página 8 - Ambos 1,1) ---
    if (isBothMandatory) {
        // 1. Buscamos la tabla que debería contener todo
        const fusionTable = studentRelational.relations.find(r => 
            r.name.toLowerCase() === (ent1Name + "_" + ent2Name).toLowerCase() ||
            r.name.toLowerCase() === (ent2Name + "_" + ent1Name).toLowerCase() ||
            r.name.toLowerCase() === rel.label.toLowerCase() ||
            r.name === ent1Name || r.name === ent2Name
        );

        if (!fusionTable) return null; // Aún no ha creado la tabla fusionada

        // 2. Si el alumno ha dejado las dos tablas por separado, ERROR
        if (studentTable1 && studentTable2) {
            return { isCorrect: false, message: ` Al ser (1,1)-(1,1), las entidades '${ent1Name}' y '${ent2Name}' DEBEN fusionarse en una única tabla.` };
        }

        // 3. VALIDAR TODO EL CONTENIDO
        const entity1 = baseER.entities.find(e => e.name === ent1Name);
        const entity2 = baseER.entities.find(e => e.name === ent2Name);

        // A. Atributos de la primera entidad
        for (const attr of entity1.attributes) {
            if (attr.isDerivated || attr.isMultivalued) continue;
            const found=fusionTable.attributes.find(sa => sa.name.toLowerCase()=== attr.name.toLowerCase());
            if (!found) {
                return { isCorrect: false, message: `ERROR: Falta el atributo '${attr.name}' de '${ent1Name}' en la tabla fusionada.` };
            }
            found.isValidated=true;
            
        }

        // B. Atributos de la segunda entidad
        for (const attr of entity2.attributes) {
            if (attr.isDerivated || attr.isMultivalued) continue;
            const found=fusionTable.attributes.find(sa => sa.name.toLowerCase() === attr.name.toLowerCase());
            if (!found) {
                return { isCorrect: false, message: `ERROR: Falta el atributo '${attr.name}' de '${ent2Name}' en la tabla fusionada.` };
            }
            found.isValidated=true;
        }

        // C. Atributos del rombo (R1)
        for (const relAttr of rel.attributes) {
            const found= fusionTable.attributes.find(sa => sa.name.toLowerCase() === relAttr.name.toLowerCase());
            if (!found) {
                return { isCorrect: false, message: `ERROR: El atributo '${relAttr.name}' de la relación debe estar en la tabla fusionada.` };
            }
            found.isValidated=true;
        }

        // D. ¿Tiene al menos una PK?
        if (!fusionTable.attributes.some(sa => sa.isPK)) {
            return { isCorrect: false, message: `ERROR: La tabla fusionada '${fusionTable.name}' debe tener una Clave Primaria.` };
        }

        runningRelational.relations.push(fusionTable);
        // ÉXITO: Limpiamos todo
        baseER.entities = baseER.entities.filter(e => e.name !== ent1Name && e.name !== ent2Name);
        const relIdx = baseER.relationships.indexOf(rel);
        baseER.relationships.splice(relIdx, 1);
        return null;
    }

    return null; 
}

    
    static map1NRelationship(baseER, studentRelational, runningRelational, rel) {
        // 1. COMPROBACIÓN DE SEGURIDAD: ¿Existe rel?
        if (!rel || !rel.participants) {
            return null; 
        }
        const roles = rel.participants;
        

        const roleN = roles.find(r => r.maxCardinality == 'N');
        const role1 = roles.find(r => r.maxCardinality == '1');

        // 2. EVITAR EL CRASH: Si no encuentra el 1 o el N, no seguimos
        if (!roleN || !role1) {
            return { 
                isCorrect: false, 
                message: `ERROR: Asegúrate de que la relación '${rel.label}' tenga marcadas las cardinalidades 1 y N.` 
            };
        }
       /* const roleN = roles.find(r => r.maxCardinality == 'N');
        const role1 = roles.find(r => r.maxCardinality == '1');*/

        const studentRelN = studentRelational.relations.find(r => r.name === roleN.entityName);
        const runningRel1 = runningRelational.relations.find(r => r.name === role1.entityName);

        if (!studentRelN || !runningRel1) return null;
        
        const pksDelLado1 = runningRel1.attributes.filter(a => a.isKey);
        // Comprobamos que TODAS las partes de la PK del lado 1 estén en el lado N
        // studentRelN.attributes.filter(a => a.isPK)
        for (const pk of pksDelLado1) {
            const foundInN=runningRel1.attributes.find(sa => sa.name === pk.name);
            if (!foundInN) {
                return { isCorrect: false, message: `Falta la clave primaria de '${roleN.entityName}' en la tabla '${role1.entityName}' por la relación '${rel.label}'.` };
            }
            foundInN.isValidated=true;
            // Regla: No debe ser PK en el lado N (a menos que sea entidad débil, pero eso va en otra función)
            if (foundInN.isPK) {
                return { 
                    isCorrect: false, 
                    message: `ERROR: El atributo '${pk.name}' no debe ser Clave Primaria en '${roleN.entityName}' (Relación 1:N).` 
                };
            }
        }
        // 3. VALIDAR FK: ¿Ha dibujado la flecha de N hacia 1?
        const tieneFK = runningRel1.fks.find(f => f.targetRelation === roleN.entityName);
        if (!tieneFK) {
            return { 
                isCorrect: false, 
                message: `ERROR: Falta definir la Clave Foránea (FK) en '${runningRel1.name}' apuntando a '${roleN.entityName}'.` 
            };
        }
        tieneFK.isValidated=true;
        
        return Mapper.mapRelationshipAttributes(baseER, studentRelational, runningRelational, rel, runningRel1);
    }
    
    // --- PASO 5: RELACIONES M:N (como tu R3) ---
    static mapMNRelationship(baseER, studentRelational, runningRelational, rel) {
        const studentTable = studentRelational.relations.find(r => r.name === rel.label);

        if (!studentTable) {
            return { isCorrect: false, message: `ERROR: La relación M:N '${rel.label}' debe tener su propia tabla.` };
        }

        // La PK de la tabla de la relación debe ser la suma de las PKs de las entidades que participan
        for (const participant of rel.participants) {
            const entityER = runningRelational.relations.find(r => r.name === participant.entityName);
            if (!entityER) return null;

            const pksDelER = entityER.attributes.filter(a => a.isPK);
            
            for (const pk of pksDelER) {
                const foundInTable = studentTable.attributes.find(sa => sa.name === pk.name);
                if (!foundInTable || !foundInTable.isPK) {
                    return { 
                        isCorrect: false, 
                        message: `ERROR: La tabla '${rel.label}' debe tener '${pk.name}' como parte de su Clave Primaria.` 
                    };
                }
                foundInTable.isValidated=true;
            }
            
            // 2. VALIDAR FK (La flechita hacia cada participante)
            const tieneFK = studentTable.fks.find(f => f.targetRelation === participant.entityName);
            if (!tieneFK) {
                return { 
                    isCorrect: false, 
                    message: `ERROR: En la relación '${rel.label}', falta la clave foránea (FK) apuntando a '${participant.entityName}'.` 
                };
            }
            tieneFK.isValidated=true;
        }
        runningRelational.relations.push(studentTable);
        // Atributos del rombo (si tuviera)
        return Mapper.mapRelationshipAttributes(baseER, studentRelational, runningRelational, rel, studentTable);
       
    }
    
   /* static mapSpecializations (baseER, studentRelational, runningRelational) {
        for (let i = baseER.specializations.length - 1; i >= 0; i--) {
            const spec = baseER.specializations[i];
            const superRel = runningRelational.relations.find(r => r.name === spec.superclassEntityName);
            if (!superRel) continue; // Esperamos a que la madre esté mapeada

            for (const subName of spec.subclassEntityNames) {
                const studentSub = studentRelational.relations.find(r => r.name === subName);
                if (!studentSub) return {isCorrect: false, message: Mapper.msg('MISSING_RELATION', [subName])};
                
                // Borramos la entidad hija del ER para avanzar
                const entIdx = baseER.entities.findIndex(e => e.name === subName);
                if (entIdx !== -1) baseER.entities.splice(entIdx, 1);
                
                // Añadimos una relación vacía al "running" para indicar que ya está procesada
                runningRelational.relations.push({name: subName, attributes: [], fks: []});
            }
            baseER.specializations.splice(i, 1);
        }
        return null;
    }*/
    static mapSpecializations (baseER, studentRelational, runningRelational) {
        for (let i = baseER.specializations.length - 1; i >= 0; i--) {
            const spec = baseER.specializations[i];
            // Buscamos si la tabla de la madre ya ha sido creada en runningRelational
            const superRel = runningRelational.relations.find(r => r.name === spec.superclassEntityName);
            
            if (superRel) {
                // Si la madre ya está, borramos la especialización de la lista de tareas
                baseER.specializations.splice(i, 1);
            }
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
