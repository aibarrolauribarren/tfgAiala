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
                
                result = Mapper.mapSpecializations(baseER, studentRelational, runningRelational)
                if (result != null) return result
                
                result = Mapper.mapCategories(baseER, studentRelational, runningRelational)
                if (result != null) return result
                
                result = Mapper.mapMultivaluedAttributes(baseER, studentRelational, runningRelational)
                if (result != null) return result
                
                result = Mapper.mapStrongEntities(baseER, studentRelational, runningRelational)
                if (result != null) return result
                              
                result = Mapper.mapWeakEntities(baseER, studentRelational, runningRelational)
                if (result != null) return result
                                               
                result = Mapper.mapRelationships(baseER, studentRelational, runningRelational)
                if (result != null) return result
                                           

                let totalAfter = baseER.entities.length + baseER.relationships.length + baseER.specializations.length + baseER.categories.length;
                
                if (totalBefore === totalAfter) {
                    //return {isCorrect: false, message: "La solución está incompleta o hay elementos mal definidos."}
                    break;
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

            // FINAL: Si el bucle while terminó por completo (borró todo el ER)
            // significa que la solución es 100% correcta.
            if (baseER.entities.length === 0 && baseER.relationships.length === 0 && 
                baseER.specializations.length === 0 && baseER.categories.length === 0) {
                return {isCorrect: true, message: "¡PERFECTO!!"};
            }

            // Si salimos del bucle pero aún quedan cosas en baseER, es que la solución está incompleta
            return {isCorrect: false, message: "La solución está incompleta. Revisa las entidades o relaciones pendientes."};
            // Si llega aquí, es que no hay "basura"
          //  return {isCorrect: true, message: "¡PERFECTO!!"}

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
            const esSubclase = baseER.specializations.some(s => s.subclassEntityNames.includes(entity.name));
            if (esSubclase) continue;
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
                const pkReal = entity.attributes.find(a => a.isKey).name;
                // --- VALIDACIÓN DE LA FK (FLECHA) ---
                const tieneFK = studentTable.fks.find(f => f.targetRelation === entity.name);

                if (!tieneFK) {
                    return { 
                        isCorrect: false, 
                        message: `ERROR: La tabla del atributo multivaluado '${studentTable.name}' debe tener una FK hacia '${entity.name}'.` 
                    };
                }
                // 1. Detectamos el origen de la flecha por cualquier medio posible
                let origenDetectado = tieneFK.originAttribute || tieneFK.fromAttribute || tieneFK.from || tieneFK.source;

                // 2. Si el origen es 'undefined' (porque la flecha sale del borde),
                // pero vemos que el alumno ha escrito "FK:A" en A1 (lo cual significa que A1 es el campo),
                // vamos a ser inteligentes y buscar si el campo A1 existe.
                if (!origenDetectado) {
                    const campoPK = studentTable.attributes.find(a => a.name === entityPKName);
                    // Si el campo A1 existe en la tabla A2, damos por hecho que la FK sale de ahí
                    if (campoPK) {
                        origenDetectado = entityPKName;
                    }
                }

                // 3. VALIDACIÓN FINAL (Muy sencilla)
                if (origenDetectado !== entityPKName) {
                    return {
                        isCorrect: false,
                        message: `ERROR: En la tabla '${studentTable.name}', la FK debe ser '${entityPKName}', no '${origenDetectado || 'la tabla'}'.`
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
            tablaDestino = studentTable2; // Destino es la entidad con (1,1)
            nombreTablaOrigen = ent1Name;
            fkEncontrada = pk1en2; // Buscamos la clave de la opcional en la obligatoria
        } else if (p2.minCardinality === '0' && p1.minCardinality === '1') {
            tablaDestino = studentTable1;
            nombreTablaOrigen = ent2Name;
            fkEncontrada = pk2en1;
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
            const hasAttr = tablaDestino.attributes.find(sa => sa.name.toLowerCase() === relAttr.name.toLowerCase());
            if (!hasAttr) {
                return { isCorrect: false, message: `ERROR: El atributo '${relAttr.name}' de la relación debe estar en la tabla '${tablaDestino.name}' junto a la FK.` };
            }
            hasAttr.isValidated=true;
        }

        // 3. Validar que no sea PK (Solo si la encontramos)
        if (fkEncontrada && fkEncontrada.isPK) {
            return { isCorrect: false, message: `ERROR: La clave foránea '${fkEncontrada.name}' no debe ser PK en '${tablaDestino.name}'` };
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
    const roles = rel.participants;
    const roleN = roles.find(r => r.maxCardinality === 'N');
    const role1 = roles.find(r => r.maxCardinality === '1');

    if (!roleN || !role1) return null;

    // TABLA DESTINO: El lado 1 recibe la clave del lado N
    const studentTableDestino = studentRelational.relations.find(r => r.name === role1.entityName);
    
    // IMPORTANTE: Buscamos la tabla ORIGEN en "runningRelational" para obtener sus PKs reales
    const tableOrigenER = runningRelational.relations.find(r => r.name === roleN.entityName);

    if (!studentTableDestino || !tableOrigenER) return null;

    // 1. VALIDAR ATRIBUTOS (La PK de N debe estar en 1)
    // CAMBIO: Usamos .isPK en lugar de .isKey
    const pksOrigen = tableOrigenER.attributes.filter(a => a.isPK);
    
    for (const pk of pksOrigen) {
        const foundInDestino = studentTableDestino.attributes.find(sa => sa.name.toLowerCase() === pk.name.toLowerCase());
        
        if (!foundInDestino) {
            return { isCorrect: false, message: `Falta la clave '${pk.name}' de '${roleN.entityName}' en la tabla '${role1.entityName}'.` };
        }

        foundInDestino.isValidated = true; // Sello de aprobación
        
        if (foundInDestino.isPK) {
            return { isCorrect: false, message: `ERROR: '${pk.name}' no debe ser PK en la tabla '${role1.entityName}' (es una relación 1:N).` };
        }
    }

    // 2. VALIDAR LA FLECHA (FK)
    const tieneFK = studentTableDestino.fks.find(f => f.targetRelation === roleN.entityName);
    if (!tieneFK) {
        return { isCorrect: false, message: `Falta la flecha de Clave Foránea (FK) desde '${role1.entityName}' hacia '${roleN.entityName}'.` };
    }
    tieneFK.isValidated = true;

    // 3. VALIDAR ATRIBUTOS DEL ROMBO (R1)
    const resAttributes = Mapper.mapRelationshipAttributes(baseER, studentRelational, runningRelational, rel, studentTableDestino);
    if (resAttributes && !resAttributes.isCorrect) return resAttributes;

    // FINAL: Si todo está bien, borramos la relación para que salga el "PERFECTO"
    const relIdx = baseER.relationships.indexOf(rel);
    if (relIdx !== -1) baseER.relationships.splice(relIdx, 1);

    return null;
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
                     message: `ERROR: En la relación '${rel.label}', falta la clave foránea (FK) apuntando a '${participant.entityName}'.` ;
             };
                
            
            if (!foundInTable || !foundInTable.isPK) {
                    return { 
                        isCorrect: false, 
                        message: `ERROR: La tabla '${rel.label}' debe tener '${pk.name}' como parte de su Clave Primaria.` 
                    };
                }
            foundInTable.isValidated=true;
        
            
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
    
 /*   static mapSpecializations(baseER, studentRelational, runningRelational) {
    for (let i = baseER.specializations.length - 1; i >= 0; i--) {
        const spec = baseER.specializations[i];
        
        // 1. Identificar elementos en el esquema del alumno
        const tableMadre = studentRelational.relations.find(r => r.name.toLowerCase() === spec.superclassEntityName.toLowerCase());
        const tablesHijas = studentRelational.relations.filter(r => 
            spec.subclassEntityNames.some(subName => subName.toLowerCase() === r.name.toLowerCase())
        );

        const esSolapada = spec.labelText === 'o';
        const esDisjunta = spec.labelText === 'd';
        // PON ESTO AL PRINCIPIO DE LA FUNCIÓN mapSpecializations
        if (!tableMadre && tablesHijas.length === 0) return null;

        // --- ESTRATEGIA 1: TABLAS SEPARADAS (Opción A) ---
        // Se detecta si el alumno ha dibujado la madre Y alguna hija
        if (tableMadre && tablesHijas.length > 0) {
            for (const subTable of tablesHijas) {
                // Validar PK heredada (con toLowerCase)
                const pksMadre = tableMadre.attributes.filter(a => a.isPK);
                for (const pk of pksMadre) {
                    const foundInHija = subTable.attributes.find(sa => sa.name.toLowerCase() === pk.name.toLowerCase());
                    if (!foundInHija || !foundInHija.isPK) {
                        return { isCorrect: false, message: `Estrategia tablas separadas: '${subTable.name}' debe heredar la PK '${pk.name}'.` };
                    }
                    foundInHija.isValidated = true;
                }

                // Validar FK
                const tieneFK = subTable.fks.find(f => f.targetRelation.toLowerCase() === spec.superclassEntityName.toLowerCase());
                if (!tieneFK) return { isCorrect: false, message: `Falta FK en '${subTable.name}' a '${spec.superclassEntityName}'.` };
                tieneFK.isValidated = true;

                // Limpiar entidades hijas de pendientes
                baseER.entities = baseER.entities.filter(e => e.name.toLowerCase() !== subTable.name.toLowerCase());
                if (!runningRelational.relations.find(r => r.name === subTable.name)) runningRelational.relations.push(subTable);
            }

            // Si es Total, deben estar todas las hijas
            if (spec.isTotal && tablesHijas.length < spec.subclassEntityNames.length) {
                return { isCorrect: false, message: `Herencia TOTAL: faltan subclases por representar.` };
            }

            baseER.specializations.splice(i, 1);
            continue;
        }
        
        // --- ESTRATEGIA 2: SOLO TABLAS HIJAS (Opción B) ---
        // Se detecta si hay hijas pero NO hay madre
        else if (!tableMadre && tablesHijas.length > 0) {
            if (!spec.isTotal || spec.allowsOverlapping) { // (Opcional: check si la jerarquía permite esto)
                 // Si no es Total, esta estrategia suele dar problemas de pérdida de datos, pero si el alumno la hace:
            }

            const superEntityER = baseER.entities.find(e => e.name.toLowerCase() === spec.superclassEntityName.toLowerCase());
            for (const subTable of tablesHijas) {
                if (superEntityER) {
                    for (const attr of superEntityER.attributes) {
                        const found = subTable.attributes.find(sa => sa.name.toLowerCase() === attr.name.toLowerCase());
                        if (!found) return { isCorrect: false, message: `Opción B: '${subTable.name}' debe incluir '${attr.name}' de la superclase.` };
                        if (attr.isKey && !found.isPK) return { isCorrect: false, message: `'${attr.name}' debe ser PK en '${subTable.name}'.` };
                        found.isValidated = true;
                    }
                }
                baseER.entities = baseER.entities.filter(e => e.name.toLowerCase() !== subTable.name.toLowerCase());
                if (!runningRelational.relations.find(r => r.name === subTable.name)) runningRelational.relations.push(subTable);
            }

            baseER.entities = baseER.entities.filter(e => e.name.toLowerCase() !== spec.superclassEntityName.toLowerCase());
            baseER.specializations.splice(i, 1);
            continue;
        }

/*
        if(esSolapada && !spec.isTotal){
            if (!tableMadre) continue;
             // Validar cada hija dibujada
                for (const subTable of tablesHijas) {
                    // A. La PK de la madre debe estar en la hija y ser PK
                    const pksMadre = tableMadre.attributes.filter(a => a.isPK);
                    for (const pk of pksMadre) {
                        const foundInHija = subTable.attributes.find(sa => sa.name === pk.name);
                        if (!foundInHija || !foundInHija.isPK) {
                            return { isCorrect: false, message: `Estrategia de tablas separadas: La subclase '${subTable.name}' debe heredar la PK '${pk.name}' de la superclase.` };
                        }
                        foundInHija.isValidated = true;
                    }

                    // B. Debe haber una FK de la hija a la madre
                    const tieneFK = subTable.fks.find(f => f.targetRelation.toLowerCase() === spec.superclassEntityName.toLowerCase());
                    if (!tieneFK) {
                        return { isCorrect: false, message: `Falta la FK en '${subTable.name}' apuntando a '${spec.superclassEntityName}'.` };
                    }
                    tieneFK.isValidated = true;

                    // C. Validar atributos propios de esta hija
                    const entityHijaER = baseER.entities.find(e => e.name.toLowerCase() === subTable.name.toLowerCase());
                    if (entityHijaER) {
                        entityHijaER.attributes.forEach(attr => {
                            const f = subTable.attributes.find(sa => sa.name === attr.name);
                            if (f) f.isValidated = true;
                        });
                        // Eliminar entidad de la lista de pendientes
                        baseER.entities = baseER.entities.filter(e => e.name.toLowerCase() !== subTable.name.toLowerCase());
                    }

                    if (!runningRelational.relations.find(r => r.name === subTable.name)) runningRelational.relations.push(subTable);
                }

                // Validación de Totalidad: Si es TOTAL (línea doble), deben estar TODAS las hijas
                if (spec.isTotal && tablesHijas.length < spec.subclassEntityNames.length) {
                    // Si el alumno no ha dibujado más tablas, es error de totalidad
                    if (studentRelational.relations.length === runningRelational.relations.length + 1) { // +1 por la madre
                        return { isCorrect: false, message: `La herencia de '${spec.superclassEntityName}' es TOTAL. Faltan subclases por representar.` };
                    }
                    continue; 
                }

                baseER.specializations.splice(i, 1);
                continue;
        }else if (spec.isTotal && (esDisjunta||esSolapada)) {// OPCION B: HERENCIA TOTAL Y DISJUNTA (Pág 22-23 PDF - Tu ejercicio de la foto) ---
                    
            if (tableMadre) {
                return { 
                    isCorrect: false, 
                    message: `ERROR: La herencia de '${spec.superclassEntityName}' es TOTAL y DISJUNTA. Según el estándar, no debe existir la tabla '${spec.superclassEntityName}'; sus atributos deben estar en las subclases.` 
                };
            }

            const superEntityER = baseER.entities.find(e => e.name.toLowerCase() === spec.superclassEntityName.toLowerCase());
            let todasHijasDibujadas = true;

            for (const subName of spec.subclassEntityNames) {
                const subTable = studentRelational.relations.find(r => r.name.toLowerCase() === subName.toLowerCase());
                
                if (!subTable) {
                    todasHijasDibujadas = false;
                    continue; 
                }
                baseER.entities = baseER.entities.filter(e => e.name.toLowerCase() !== subName.toLowerCase()); // <<-- AÑADE ESTO AQUÍ
                // Validar que la hija tenga TODOS los atributos de la superclase (DNI, Nombre, etc.)
                if (superEntityER) {
                    for (const attr of superEntityER.attributes) {
                        const found = subTable.attributes.find(sa => sa.name.toLowerCase() === attr.name.toLowerCase());
                        if (!found) return { isCorrect: false, message: `La tabla '${subTable.name}' debe incluir el atributo heredado '${attr.name}'.` };
                        if (attr.isKey && !found.isPK){
                                return { 
                                isCorrect: false,
                                 message: `El atributo '${attr.name}' debe ser PK en '${subTable.name}'.` };
                        } else {
                            // CASO B: NO es clave en el ER pero el alumno la ha puesto como PK (EL ERROR QUE TIENES)
                            if (found.isPK && !attr.isKey) {
                                return { 
                                    isCorrect: false, 
                                    message: `Error en '${subTable.name}': El atributo heredado '${attr.name}' no puede ser Clave Primaria (solo lo es la clave de la superclase).` 
                                };
                            }

                            found.isValidated = true;
                        }
                    }
                }

                // Validar atributos propios de la hija
                const entityHijaER = baseER.entities.find(e => e.name.toLowerCase() === subName.toLowerCase());
                if (entityHijaER) {
                    for (const attrPropio of entityHijaER.attributes) {
                        const f = subTable.attributes.find(sa => sa.name.toLowerCase() === attrPropio.name.toLowerCase());

                        if (f) {
                            // --- BLOQUEO DE PK INCORRECTA ---
                            // Si el atributo es propio de la hija, NO puede ser PK
                            if (f.isPK) {
                                return { 
                                    isCorrect: false, 
                                    message: `Error en '${subTable.name}': El atributo propio '${f.name}' no puede ser Clave Primaria. En esta estrategia, la PK solo debe ser el atributo heredado de la superclase.` 
                                };
                            }
                            f.isValidated = true;
                        }
                    }
                    // Eliminamos la entidad hija de la lista de pendientes
                    baseER.entities = baseER.entities.filter(e => e.name.toLowerCase() !== subName.toLowerCase());
                }

                if (!runningRelational.relations.find(r => r.name === subTable.name)) runningRelational.relations.push(subTable);
            }

            if (todasHijasDibujadas) {
                baseER.entities = baseER.entities.filter(e => e.name.toLowerCase() !== spec.superclassEntityName.toLowerCase());
                baseER.specializations.splice(i, 1);
            }
            continue; // Pasamos a la siguiente especialización
        
        }
            else if (/*!spec.isTotal && esDisjunta tableMadre && tablesHijas.length===0){
                // Si el alumno ha dibujado la tabla madre (aunque no haya hijas, porque es tabla ÚNICA)
                if (tableMadre) { 
                    const superEntityER = baseER.entities.find(e => e.name.toLowerCase() === spec.superclassEntityName.toLowerCase());

                    // Buscamos el discriminador
                    const discriminador = tableMadre.attributes.find(a => {
                        const estaEnMadre = superEntityER?.attributes.some(ma => ma.name.toLowerCase() === a.name.toLowerCase());
                        const estaEnHijas = spec.subclassEntityNames.some(subName => {
                            const eH = baseER.entities.find(e => e.name.toLowerCase() === subName.toLowerCase());
                            return eH?.attributes.some(ha => ha.name.toLowerCase() === a.name.toLowerCase());
                        });
                        return !estaEnMadre && !estaEnHijas;
                    });

                    // SI NO HAY DISCRIMINADOR, ERROR INMEDIATO
                    if (!discriminador) {
                        return { 
                            isCorrect: false, 
                            message: `Estrategia Tabla Única: En '${tableMadre.name}' falta el atributo DISCRIMINADOR (ej. PoS, Tipo).` 
                        };
                    }

                    discriminador.isValidated = true;

                    // 2. VALIDAR QUE ESTÉN TODOS LOS ATRIBUTOS DE TODAS LAS HIJAS
                    for (const subName of spec.subclassEntityNames) {
                        const entityHijaER = baseER.entities.find(e => e.name.toLowerCase() === subName.toLowerCase());
                        if (entityHijaER) {
                            for (const attrHija of entityHijaER.attributes) {
                                const found = tableMadre.attributes.find(ma => ma.name.toLowerCase() === attrHija.name.toLowerCase());

                                // --- CAMBIO CLAVE: Si falta un atributo de una hija en la tabla única, ERROR ---
                                if (!found) {
                                    return { 
                                        isCorrect: false, 
                                        message: `Estrategia Tabla Única: La tabla '${tableMadre.name}' debe incluir el atributo '${attrHija.name}' de la subclase '${subName}'.` 
                                    };
                                }
                                // --- CAMBIO CLAVE: Los atributos de las hijas NO pueden ser PK en Tabla Única ---
                                if (found.isPK) {
                                    return {
                                        isCorrect: false,
                                        message: `Error en '${tableMadre.name}': El atributo '${found.name}' proviene de una subclase y NO debe ser Clave Primaria en la Estrategia de Tabla Única.`
                                    };
                                }
                                found.isValidated = true;
                            }
                            // Una vez validados sus atributos, quitamos la entidad hija de pendientes
                            baseER.entities = baseER.entities.filter(e => e.name.toLowerCase() !== subName.toLowerCase());
                        }
                    }

                    // 3. VALIDAR ATRIBUTOS DE LA MADRE (DNI, Nombre...)
                    if (superEntityER) {
                        superEntityER.attributes.forEach(attr => {
                            const found = tableMadre.attributes.find(a => a.name.toLowerCase() === attr.name.toLowerCase());
                            if (found) found.isValidated = true;
                        });
                    }

                    // 4. FINALIZAR
                    baseER.entities = baseER.entities.filter(e => e.name.toLowerCase() !== spec.superclassEntityName.toLowerCase());
                    baseER.specializations.splice(i, 1);
                    if (!runningRelational.relations.find(r => r.name === tableMadre.name)) {
                        runningRelational.relations.push(tableMadre);
                    }
                    continue;

                }
        }
        
    }
    return null;
}   */
    
    static mapSpecializations(baseER, studentRelational, runningRelational) {
    for (let i = 0; i < baseER.specializations.length; i++) {
        const spec = baseER.specializations[i];
      //  const esMultiple = Array.isArray(spec.superclassEntityName);
        const superNames = Array.isArray(spec.superclassEntityName) 
        ? spec.superclassEntityName 
        : [spec.superclassEntityName];

        const esMultiple = superNames.length > 1;
        if (esMultiple) {

                        let supersRaw = Array.isArray(spec.superclassEntityName) ? spec.superclassEntityName : [spec.superclassEntityName];
                let subsRaw = Array.isArray(spec.subclassEntityNames) ? spec.subclassEntityNames : [spec.subclassEntityNames];

                let subName, superNames;

                // --- EL TRUCO PARA DESEMPATAR ---
                // En una Categorización (Unión), los PADRES ya existen en el diagrama original.
                // La HIJA (C) suele ser la que NO tiene atributos en el modelo original o 
                // simplemente nos basamos en la cantidad.

                // Si el editor te dice que hay 1 superclase y 2 subclases, ¡está al revés!
                if (supersRaw.length === 1 && subsRaw.length > 1) {
                    subName = supersRaw[0];    // "C"
                    superNames = subsRaw;      // ["A", "B"]
                } else {
                    subName = subsRaw[0];      // Caso normal
                    superNames = supersRaw;
                }

                // --- RE-VALIDACIÓN MANUAL (Por si acaso siguen al revés) ---
                // Si subName es "A" pero sabemos que "A" es un padre en el diagrama...
                const esPadreReal = baseER.entities.find(e => e.name === subName && e.attributes.some(a => a.isKey));
                if (esPadreReal && superNames.length > 0) {
                    // Intercambio de emergencia: lo que el JSON llama hija es en realidad un padre
                    const temp = subName;
                    subName = superNames[0]; 
                    superNames = [temp, ...superNames.slice(1)];
                }

                // Ahora subName DEBERÍA ser "C"
                const subTable = studentRelational.relations.find(r => r.name.toLowerCase() === subName.toLowerCase());

                if (!subTable) return { isCorrect: false, message: `Falta la tabla '${subName}'.` };

                // 2. COGEMOS LAS PKs DE LOS PADRES (A y B)
                const pksPadres = [];
                superNames.forEach(pName => {
                    const ent = baseER.entities.find(e => e.name.toLowerCase() === pName.toLowerCase());
                    // Buscamos el atributo que es clave en el modelo ER
                    const pk = ent?.attributes?.find(a => a.isKey);
                    if (pk) pksPadres.push(pk.name.toLowerCase().trim());
                });
            // 3. COMPARACIÓN REAL
            // Miramos si todas las PKs de los padres se llaman igual
            const todasPksIguales = pksPadres.length > 1 && pksPadres.every(p => p === pksPadres[0]);

            if (todasPksIguales) {
                // --- CASO: PKs IGUALES (HERENCIA) ---
                const nombrePkHeredada = pksPadres[0];
                const pkHeredada = subTable.attributes.find(a => a.name.toLowerCase() === nombrePkHeredada && a.isPK);

                if (!pkHeredada) {
                    return { isCorrect: false, message: `La tabla '${subName}' debe heredar la PK '${nombrePkHeredada}'.` };
                }
                pkHeredada.isValidated = true;

                // La hija (C) debe tener FKs hacia cada padre (A y B)
                for (const pName of superNames) {
                    const tieneFK = subTable.fks?.find(f => f.targetRelation.toLowerCase() === pName.toLowerCase());
                    if (tieneFK) {
                        tieneFK.isValidated = true;
                    } else {
                        return { isCorrect: false, message: `La tabla '${subName}' necesita una FK hacia '${pName}'.` };
                    }
                }
            } else {
                // --- CASO: CATEGORIZACIÓN (PKs DISTINTAS o UNIÓN) ---
                // La hija (C) tiene su propia PK (inventada)
                
                
                const pkPropia = subTable.attributes.find(a => a.isPK);
                if (!pkPropia) {
                    return { isCorrect: false, message: `En una unión, la tabla '${subName}' necesita su propia clave primaria.` };
                }
                pkPropia.isValidated = true;

                // Los padres (A y B) heredan esa clave como atributo y FK hacia la hija
                for (const pName of superNames) {
                    const tablaPadre = studentRelational.relations.find(r => r.name.toLowerCase() === pName.toLowerCase());
                    if (!tablaPadre) return { isCorrect: false, message: `Falta la tabla '${pName}'.` };

                    const tieneFK = tablaPadre.fks?.find(f => f.targetRelation.toLowerCase() === subName.toLowerCase());
                    if (tieneFK) {
                        tieneFK.isValidated = true;
                        // Validamos el atributo en el padre que hace de FK
                        const attrEnPadre = tablaPadre.attributes.find(a => a.name.toLowerCase() === pkPropia.name.toLowerCase());
                        if (attrEnPadre) attrEnPadre.isValidated = true;
                    } else {
                        return { isCorrect: false, message: `La tabla '${pName}' debe tener una FK hacia '${subName}'.` };
                    }
                }
            }

            // 4. Validar atributos normales (C1...)
            const entidadC = baseER.entities.find(e => e.name.toLowerCase() === subName.toLowerCase());
            entidadC?.attributes?.forEach(attrER => {
                const found = subTable.attributes.find(a => a.name.toLowerCase() === attrER.name.toLowerCase());
                if (found) found.isValidated = true;
            });

            // 5. Finalizar
            if (!runningRelational.relations.find(r => r.name === subTable.name)) {
                runningRelational.relations.push(subTable);
            }
            baseER.specializations.splice(i, 1);
            i--;
            continue;
        }
        else{
          /*  const superEntity = baseER.entities.find(e => e.name.toLowerCase() === spec.superclassEntityName.toLowerCase());
            if (!superEntity) continue;
            const tableMadre = studentRelational.relations.find(r => r.name.toLowerCase() === spec.superclassEntityName.toLowerCase());
            const tableHijas = studentRelational.relations.filter(r => 
                spec.subclassEntityNames.map(name => name.toLowerCase()).includes(r.name.toLowerCase())
            );*/
            // --- HERENCIA NORMAL (1 Madre -> N Hijas) ---
            // Como ahora superclassEntityName es un array, sacamos el primer (y único) nombre
            const superName = Array.isArray(spec.superclassEntityName) 
                ? spec.superclassEntityName[0] 
                : spec.superclassEntityName;

            const superEntity = baseER.entities.find(e => e.name.toLowerCase() === superName.toLowerCase());
            if (!superEntity) continue;

            const tableMadre = studentRelational.relations.find(r => r.name.toLowerCase() === superName.toLowerCase());

            // El resto de subclassEntityNames ya es un array, así que esto está bien:
            const tableHijas = studentRelational.relations.filter(r => 
                spec.subclassEntityNames.map(name => name.toLowerCase()).includes(r.name.toLowerCase())
            );

            if (!tableMadre && tableHijas.length === 0) continue;

            // --- DETECTAR SI EL ALUMNO QUIERE USAR ESTRATEGIA C (TABLA ÚNICA) ---
            // Lo sabemos si hay atributos de las hijas metidos en la tabla madre
            const atributosHijasEnMadre = spec.subclassEntityNames.some(subName => {
                const subER = baseER.entities.find(e => e.name.toLowerCase() === subName.toLowerCase());
                return subER && subER.attributes.some(attrH => 
                    tableMadre && tableMadre.attributes.some(a => a.name.toLowerCase() === attrH.name.toLowerCase())
                );
            });

            if (atributosHijasEnMadre || (tableMadre && tableHijas.length === 0)) {
                // 1. Error si mezcla: No pueden existir las tablas de las hijas
                if (tableHijas.length > 0) {
                    return { isCorrect: false, message: `Error de diseño: Si usas Tabla Única en '${tableMadre.name}', no deben existir tablas como '${tableHijas[0].name}'.` };
                }

                // 2. Validar atributos de la Madre (los suyos)
                for (const attr of superEntity.attributes) {
                    const found = tableMadre.attributes.find(a => a.name.toLowerCase() === attr.name.toLowerCase());
                    if (!found) return { isCorrect: false, message: `Falta '${attr.name}' en la tabla '${tableMadre.name}'.` };
                    if (attr.isKey && !found.isPK) return { isCorrect: false, message: `'${attr.name}' debe ser PK.` };
                    found.isValidated = true;
                }

                // 3. Validar atributos de TODAS las hijas en la Madre
                for (const subName of spec.subclassEntityNames) {
                    const subEntityER = baseER.entities.find(e => e.name.toLowerCase() === subName.toLowerCase());
                    if (subEntityER) {
                        for (const attrHija of subEntityER.attributes) {
                            const foundInMadre = tableMadre.attributes.find(a => a.name.toLowerCase() === attrHija.name.toLowerCase());
                            if (!foundInMadre) return { isCorrect: false, message: `La tabla única '${tableMadre.name}' debe incluir '${attrHija.name}' de la subclase '${subName}'.` };
                            foundInMadre.isValidated = true;
                        }
                    }
                }

                // 4. DISCRIMINADOR: Obligatorio si es Disjunta ('d')
                // (En solapadas 'o' es recomendable, pero en 'd' es estrictamente necesario)
                if (!spec.allowsOverlapping) {
                    const disc = tableMadre.attributes.find(a => !a.isValidated && !a.isFK);
                    if (!disc) {
                        return { isCorrect: false, message: `La especialización es disjunta ('d'). La tabla única '${tableMadre.name}' necesita un atributo discriminador (ej. 'Tipo').` };
                    }
                    disc.isValidated = true;
                }

                finalizeSpec(i, tableMadre, spec, baseER, runningRelational);
                return null;
            }
            // --- ESTRATEGIA A: TABLA PARA CADA ENTIDAD (O TABLA ÚNICA) ---
            if (tableMadre && tableHijas.length>0) {
                // Validar atributos de la superclase en la tabla madre
                for (const attr of superEntity.attributes) {
                    const found = tableMadre.attributes.find(a => a.name.toLowerCase() === attr.name.toLowerCase());
                    if (!found) return { isCorrect: false, message: `Falta el atributo '${attr.name}' en la tabla '${tableMadre.name}'.` };
                    if (attr.isKey && !found.isPK) return { isCorrect: false, message: `El atributo '${attr.name}' debe ser PK en '${tableMadre.name}'.` };
                    found.isValidated = true;
                }

                // Validar las tablas hijas si existen (Herencia de PK)
                for (const subName of spec.subclassEntityNames) {
                    const subTable = studentRelational.relations.find(r => r.name.toLowerCase() === subName.toLowerCase());
                    if (!subTable) {
                        return { isCorrect: false, message: `Falta la tabla para la subclase '${subName}'.` };
                    }
                    if (subTable) {

                        // En Opción A, la hija debe tener la PK de la madre
                        const pkMadreER = superEntity.attributes.find(a => a.isKey);
                        const pkHija = subTable.attributes.find(a => a.name.toLowerCase() === pkMadreER.name.toLowerCase());

                        if (!pkHija || !pkHija.isPK) {
                            return { isCorrect: false, message: `La tabla hija '${subTable.name}' debe tener la PK de la madre ('${pkMadreER.name}') como su propia PK.` };
                        }
                        pkHija.isValidated = true;

                        // 2. NUEVO: Validar la FK apuntando a la Madre
                        // Aseguramos que exista el array de fks para que no de error
                        const fks = subTable.fks || [];
                        const tieneFK = fks.find(f => f.targetRelation.toLowerCase() === superName.toLowerCase()); 
                        if (!tieneFK) {
                            return { isCorrect: false, message: `Falta la FK en la tabla '${subTable.name}' que apunte a la tabla madre '${superName}'.` }; // <-- CAMBIADO
                        }
                        tieneFK.isValidated = true;
                        // Validar atributos propios de la hija
                        const subEntityER = baseER.entities.find(e => e.name.toLowerCase() === subName.toLowerCase());
                        if (subEntityER) {
                            for (const attrPropio of subEntityER.attributes) {
                                const found = subTable.attributes.find(a => a.name.toLowerCase() === attrPropio.name.toLowerCase());
                                if (!found) {
                                    return { isCorrect: false, message: `Falta el atributo propio '${attrPropio.name}' en la tabla '${subTable.name}'.` };
                                }
                                // Los atributos propios en esta estrategia NO deben ser PK
                                if (found.isPK && !attrPropio.isKey) {
                                    return { isCorrect: false, message: `El atributo '${found.name}' en '${subTable.name}' no debería ser PK.` };
                                }
                                found.isValidated = true;
                            }
                        }
                        if (!runningRelational.relations.find(r => r.name === subTable.name)) runningRelational.relations.push(subTable);
                    }
                }

                // Limpieza y finalización
                if (!runningRelational.relations.find(r => r.name === tableMadre.name)) runningRelational.relations.push(tableMadre);
                baseER.entities = baseER.entities.filter(e => 
                   e.name.toLowerCase() !== superName.toLowerCase() &&  // <-- CAMBIADO
                    !spec.subclassEntityNames.map(n => n.toLowerCase()).includes(e.name.toLowerCase())
                );
                baseER.specializations.splice(i, 1);


                return null;
            }

            // --- ESTRATEGIA B: SOLO TABLAS PARA LAS HIJAS (Bajar atributos) ---
            // Solo entramos aquí si NO hay tabla madre y la especialización es TOTAL
            else if (/*spec.isTotal && tableHijas.length>0*/!tableMadre && tableHijas.length > 0) {
                // VALIDACIÓN CRÍTICA: ¿Es parcial?
        if (!spec.isTotal) {
            return { 
                isCorrect: false, 
                message: `Error: No puedes eliminar la tabla madre '${spec.superclassEntityName}' porque la especialización es parcial (una línea). Debes usar la Estrategia A (todas las tablas) o la C (tabla única).` 
            };
        }
                let todasHijasDibujadas = true;
                for (const subName of spec.subclassEntityNames) {
                    const subTable = studentRelational.relations.find(r => r.name.toLowerCase() === subName.toLowerCase());
                    if (!subTable) {
                        todasHijasDibujadas = false;
                        break;
                    }

                    // 1. Debe heredar TODOS los atributos de la madre
                    for (const attr of superEntity.attributes) {
                        const found = subTable.attributes.find(a => a.name.toLowerCase() === attr.name.toLowerCase());
                        if (!found) return { isCorrect: false, message: `Al no haber tabla madre (herencia total), '${subTable.name}' debe incluir el atributo heredado '${attr.name}'.` };
                        if (attr.isKey && !found.isPK) return { isCorrect: false, message: `'${attr.name}' debe ser PK en '${subTable.name}'.` };
                        found.isValidated = true;
                    }

                    // 2. Sus propios atributos
                    const subEntityER = baseER.entities.find(e => e.name.toLowerCase() === subName.toLowerCase());
                    if (subEntityER) {
                        for (const attrP of subEntityER.attributes) {
                            const foundP = subTable.attributes.find(a => a.name.toLowerCase() === attrP.name.toLowerCase());
                            if (foundP) {
                                if (foundP.isPK) return { isCorrect: false, message: `El atributo propio '${foundP.name}' no puede ser PK en '${subTable.name}'.` };
                                foundP.isValidated = true;
                            }
                        }
                    }
                    if (!runningRelational.relations.find(r => r.name === subTable.name)) runningRelational.relations.push(subTable);
                }

                if (todasHijasDibujadas) {
                    baseER.entities = baseER.entities.filter(e => 
                        e.name.toLowerCase() !== superName.toLowerCase() &&  // <-- CAMBIADO
                        !spec.subclassEntityNames.map(n => n.toLowerCase()).includes(e.name.toLowerCase())
                    );
                    baseER.specializations.splice(i, 1);
                    return null;
                }
            }
            function finalizeSpec(index) {
                if (tableMadre && !runningRelational.relations.find(r => r.name === tableMadre.name)) {
                    runningRelational.relations.push(tableMadre);
                }
                const namesToFilter = [superName.toLowerCase(), ...spec.subclassEntityNames.map(n => n.toLowerCase())]; // <-- CAMBIADO
                baseER.entities = baseER.entities.filter(e => !namesToFilter.includes(e.name.toLowerCase()));
                baseER.specializations.splice(index, 1);
            }
        
        return null;
        }
    }
}
   

static mapCategories(baseER, studentRelational, runningRelational) {
    // 1. Limpiamos espacios y normalizamos nombres del ER para evitar fallos de búsqueda
  /*  const entitiesER = baseER.entities;

    for (let i = baseER.categories.length - 1; i >= 0; i--) {
        const cat = baseER.categories[i];
        const nombreCatER = cat.categoryEntityName.trim().toLowerCase();

        // 2. BUSCAR LA TABLA DEL ALUMNO (con trim para evitar "C " vs "C")
        const tableHija = studentRelational.relations.find(r => 
            r.name.trim().toLowerCase() === nombreCatER
        );
        
        // Si el alumno no ha creado la tabla, no podemos validar nada aún
        if (!tableHija) continue;

        console.log(`Validando Categoría: ${tableHija.name}`);

        // 3. RECOLECTAR LAS PKs QUE DEBERÍA TENER (de los padres A, B...)
        let clavesObligatorias = [];
        cat.superclassEntityNames.forEach(parentName => {
            const padreER = entitiesER.find(e => e.name.trim().toLowerCase() === parentName.trim().toLowerCase());
            if (padreER) {
                const pksER = padreER.attributes
                    .filter(a => a.isKey)
                    .map(a => a.name.trim().toUpperCase());
                clavesObligatorias.push(...pksER);
            }
        });

        const pksUnicasER = [...new Set(clavesObligatorias)];
        console.log("PKs que C debería heredar:", pksUnicasER);

        // 4. EL FILTRO DE SEGURIDAD (La "Aduana")
        // Comprobamos si CADA clave del ER existe en la tabla del alumno y es PK
        for (const nombrePK of pksUnicasER) {
            const attrAlumno = tableHija.attributes.find(a => 
                a.name.trim().toUpperCase() === nombrePK
            );
            
            // SI NO ESTÁ LA K O NO ESTÁ SUBRAYADA (isPK) -> ERROR FULMINANTE
            if (!attrAlumno || attrAlumno.isPK !== true) {
                return { 
                    isCorrect: false, 
                    message: `ERROR: La tabla '${tableHija.name}' debe incluir '${nombrePK}' como Clave Primaria (PK) heredada.` 
                };
            }
            attrAlumno.isValidated = true;
        }

        // 5. VALIDAR FKs (Flechas hacia A y B)
        for (const parentName of cat.superclassEntityNames) {
            const tieneFK = tableHija.fks.find(f => 
                f.targetRelation.trim().toLowerCase() === parentName.trim().toLowerCase()
            );
            
            if (!tieneFK) {
                return { 
                    isCorrect: false, 
                    message: `ERROR: Falta la relación (FK) desde '${tableHija.name}' hacia '${parentName}'.` 
                };
            }
            tieneFK.isValidated = true;
        }

        // 6. ATRIBUTOS PROPIOS (C1...)
        const entityCatER = entitiesER.find(e => e.name.trim().toLowerCase() === nombreCatER);
        if (entityCatER) {
            entityCatER.attributes.forEach(attrER => {
                if (attrER.isMultivalued || attrER.isDerivated) return;
                
                const encontrado = tableHija.attributes.find(a => 
                    a.name.trim().toLowerCase() === attrER.name.trim().toLowerCase()
                );
                
                if (!encontrado) {
                    return { isCorrect: false, message: `ERROR: Falta el atributo '${attrER.name}' en '${tableHija.name}'.` };
                }
                encontrado.isValidated = true;
            });
            
            // CRITICAL: Marcar la entidad como procesada para que mapStrongEntities no la ignore o la valide mal
            baseER.entities = baseER.entities.filter(e => e.name.trim().toLowerCase() !== nombreCatER);
        }

        // 7. FINALIZAR
        if (!runningRelational.relations.find(r => r.name === tableHija.name)) {
            runningRelational.relations.push(tableHija);
        }
        baseER.categories.splice(i, 1);
    }*/
    return null;
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
