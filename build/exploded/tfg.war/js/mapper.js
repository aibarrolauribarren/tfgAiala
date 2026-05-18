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
                
                result = Mapper.mapCategories(baseER, studentRelational, runningRelational)
                if (result != null) return result
                
                result = Mapper.mapSpecializations(baseER, studentRelational, runningRelational)
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
          /*  const tieneFK = studentTable.fks.find(f => f.targetRelation === pFuerte.entityName);
            if (!tieneFK) {
                return { 
                    isCorrect: false, 
                    message: `ERROR: Falta la relación (FK) de '${entity.name}' apuntando a '${pFuerte.entityName}'.` 
                };
            }
            tieneFK.isValidated = true;*/
                // ====================================================================
// VALIDAR FK (Adaptado al JSON real del editor: revisa el array .attributes)
// ====================================================================
const tieneFK = studentTable.fks.find(f => f.targetRelation === pFuerte.entityName);

if (!tieneFK) {
    return { 
        isCorrect: false, 
        message: `ERROR: Falta la relación (FK) de '${entity.name}' apuntando a '${pFuerte.entityName}'.` 
    };
}

// Sacamos el atributo real donde el alumno ha pulsado el botón verde de FK
const nombreOrigenFK = tieneFK.attributes && tieneFK.attributes[0];

// En una entidad débil, las FKs heredadas de la fuerte DEBEN nacer de esos mismos atributos heredados.
// Validamos que el origen de la FK coincida con alguna de las PKs de la entidad fuerte.
const esAtributoValido = pksFuerte.some(pk => pk.name.toLowerCase().trim() === nombreOrigenFK?.toLowerCase().trim());

if (!nombreOrigenFK) {
    return {
        isCorrect: false,
        message: `ERROR: La FK de '${entity.name}' hacia '${pFuerte.entityName}' debe estar vinculada a los atributos heredados.`
    };
}

if (!esAtributoValido) {
    return {
        isCorrect: false,
        message: `Error de diseño en '${entity.name}': La FK hacia '${pFuerte.entityName}' está mal colocada. Debe nacer de un atributo heredado de la fuerte, no de '${nombreOrigenFK}'.`
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
              /*  const tieneFK = studentTable.fks.find(f => f.targetRelation === entity.name);

                if (!tieneFK) {
                    return { 
                        isCorrect: false, 
                        message: `ERROR: La tabla del atributo multivaluado '${studentTable.name}' debe tener una FK hacia '${entity.name}'.` 
                    };
                }*/
                    // ====================================================================
                // --- VALIDACIÓN DE LA FK REESCRITA CON EL ARRAY REAL ENCONTRADO ---
                // ====================================================================
                const tieneFK = studentTable.fks.find(f => f.targetRelation === entity.name);

                if (!tieneFK) {
                    return { 
                        isCorrect: false, 
                        message: `ERROR: La tabla del atributo multivaluado '${studentTable.name}' debe tener una FK hacia '${entity.name}'.` 
                    };
                }

                // Extraemos de forma segura el atributo origen usando la propiedad real de tu JSON
                const origenDetectado = tieneFK.attributes && tieneFK.attributes[0];

                // Si no hay nada seleccionado o si seleccionó el atributo erróneo (no es la PK de la entidad)
                if (!origenDetectado) {
                    return {
                        isCorrect: false,
                        message: `ERROR: La FK en la tabla '${studentTable.name}' debe nacer del atributo heredado '${entityPKName}'.`
                    };
                }

                if (origenDetectado.toString().toLowerCase().trim() !== entityPKName.toLowerCase().trim()) {
                    return {
                        isCorrect: false,
                        message: `ERROR: En la tabla '${studentTable.name}', la FK hacia '${entity.name}' debe nacer de '${entityPKName}', no de '${origenDetectado}'.`
                    };
                }

                tieneFK.isValidated = true;
                // ====================================================================
                
                // 1. Detectamos el origen de la flecha por cualquier medio posible
                
               /* let origenDetectado = tieneFK.originAttribute || tieneFK.fromAttribute || tieneFK.from || tieneFK.source;

                // 2. Si el origen es 'undefined' (porque la flecha sale del borde),
                // pero vemos que el alumno ha escrito "FK:A" en A1 (lo cual significa que A1 es el campo),
                // vamos a ser inteligentes y buscar si el campo A1 existe.
                if (!origenDetectado) {
                    const campoPK = studentTable.attributes.find(a => a.name === entityPKName);
                    // Si el campo A1 existe en la tabla A2, damos por hecho que la FK sale de ahí
                    if (campoPK) {
                        origenDetectado = entityPKName;
                    }
                }*/

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
                });
            }
        }

     
        // ====================================================================
        // --- VALIDACIÓN DE FKs EN RELACIONES N-ARIAS (Mapeo estricto de attributes) ---
        // ====================================================================
        for(let i=0;i<pkRelations.length;i++){
            const r = relations[i]
            const pkAttrs = pkRelations[i]
            
            // Buscamos la FK que apunte a la entidad participante actual
            const studentFK = studentNaryRelation.fks.find((fk) => fk.targetRelation == r.name && (fk.checked == null || fk.checked == false))
            if (studentFK == null) {
                return {isCorrect: false, message: Mapper.msg('MISSING_NARY_RELATION_FK',[relationship.label, r.name])}
            }
            studentFK.isValidated = true;

            // Extraemos los atributos donde el alumno ha asociado esta FK en la tabla intermedia
            const origenAtributosFK = studentFK.attributes || [];

            for (const a of pkAttrs){
                // Buscamos si el atributo clave de la entidad fuerte existe dentro del origen de la FK del alumno
                const tieneAtributoFk = origenAtributosFK.some(nombreAttr => 
                    nombreAttr.toLowerCase().trim() === a.name.toLowerCase().trim()
                );
                
                if (!tieneAtributoFk){
                    return {
                        isCorrect: false, 
                        message: Mapper.msg('MISSING_NARY_RELATION_FK_ATTRIBUTES',[relationship.label, r.name, a.name])
                    }
                }
            }
            
            // Seguridad: El alumno no puede meter más atributos en la FK que los que componen la PK original
            if (origenAtributosFK.length != pkAttrs.length){
                return {isCorrect: false, message: Mapper.msg('MORE_NARY_RELATION_FK_ATTRIBUTES',[studentNaryRelation.name, r.name])}
            }
            
            studentFK.checked = true

            runningRelation.fks.push({
                targetRelation: r.name,
                attributes: pkAttrs.map((a) => a.name)
            })
        }
        // ====================================================================

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

        // 1. IDENTIFICAR DESTINO (Determinamos de forma estricta qué debería haber viajado)
        let tablaDestino = null;
        let nombreTablaOrigen = "";
        let nombreAtributoEsperado = "";

        if (p1.minCardinality === '0' && p2.minCardinality === '1') {
            tablaDestino = studentTable2; // Destino es la entidad con (1,1)
            nombreTablaOrigen = ent1Name;
            nombreAtributoEsperado = pk1.name;
        } else if (p2.minCardinality === '0' && p1.minCardinality === '1') {
            tablaDestino = studentTable1;
            nombreTablaOrigen = ent2Name;
            nombreAtributoEsperado = pk2.name;
        } else {
            // Caso (0,1)-(0,1) - Elige cualquiera donde el alumno haya puesto el atributo
            if (pk1en2) {
                tablaDestino = studentTable2;
                nombreTablaOrigen = ent1Name;
                nombreAtributoEsperado = pk1.name;
            } else {
                tablaDestino = studentTable1;
                nombreTablaOrigen = ent2Name;
                nombreAtributoEsperado = pk2.name;
            }
        }

        // Buscamos el objeto físico del atributo en la tabla destino elegida
        const fkEncontrada = tablaDestino.attributes.find(sa => sa.name.toLowerCase() === nombreAtributoEsperado.toLowerCase());

        // --- LAS VALIDACIONES DE ERROR ---
        if (!fkEncontrada) {
            return { 
                isCorrect: false, 
                message: `La clave '${nombreAtributoEsperado}' de la entidad opcional debe viajar a la tabla destino '${tablaDestino.name}' como FK.` 
            };
        }
        
        // ⭐ ¡¡AQUÍ ESTÁ EL CAMBIO CLAVE!! ⭐
        // Marcamos el atributo como validado para que el bucle general de la app no diga que "no pertenece al modelo"
        fkEncontrada.isValidated = true; 
            
        // VALIDACIÓN DE LA RELACIÓN DE CLAVE AJENA (FK)
        const fkDefinida = tablaDestino.fks.find(f => f.targetRelation.toLowerCase().trim() === nombreTablaOrigen.toLowerCase().trim());
        if (!fkDefinida) {
            return { 
                isCorrect: false, 
                message: `ERROR: Falta definir la Clave Foránea (FK) en '${tablaDestino.name}' apuntando a '${nombreTablaOrigen}'.` 
            };
        }

        // Extraemos de forma segura el atributo origen real del botón verde
        const origenDetectadoFK = fkDefinida.attributes && fkDefinida.attributes[0];

        if (!origenDetectadoFK) {
            return {
                isCorrect: false,
                message: `ERROR: La FK en la tabla '${tablaDestino.name}' debe estar vinculada al atributo '${nombreAtributoEsperado}'.`
            };
        }

        // Validamos que el botón verde apunte estrictamente al campo correcto
        if (origenDetectadoFK.toString().toLowerCase().trim() !== nombreAtributoEsperado.toLowerCase().trim()) {
            return {
                isCorrect: false,
                message: `Error de diseño en '${tablaDestino.name}': La FK hacia '${nombreTablaOrigen}' debe nacer del atributo '${nombreAtributoEsperado}', no de '${origenDetectadoFK}'.`
            };
        }

        fkDefinida.isValidated = true;

        // 2. VALIDAR ATRIBUTOS DEL ROMBO (R1)
        for (const relAttr of rel.attributes) {
            const hasAttr = tablaDestino.attributes.find(sa => sa.name.toLowerCase() === relAttr.name.toLowerCase());
            if (!hasAttr) {
                return { isCorrect: false, message: `ERROR: El atributo '${relAttr.name}' de la relación debe estar en la tabla '${tablaDestino.name}' junto a la FK.` };
            }
            hasAttr.isValidated = true; // Sella el atributo del rombo para que pase el test general
        }

        // 3. Validar que no sea PK
        if (fkEncontrada.isPK) {
            return { isCorrect: false, message: `ERROR: La clave foránea '${fkEncontrada.name}' no debe ser PK en '${tablaDestino.name}'` };
        }
        
        // REGISTRO CORRECTO EN EL RUNNING
        const idxRunning = runningRelational.relations.findIndex(r => r.name === tablaDestino.name);
        if (idxRunning !== -1) {
            runningRelational.relations[idxRunning] = tablaDestino;
        } else {
            runningRelational.relations.push(tablaDestino);
        }

        const otraTablaNombre = (tablaDestino.name === studentTable1.name) ? studentTable2.name : studentTable1.name;
        const otraTablaStudent = (tablaDestino.name === studentTable1.name) ? studentTable2 : studentTable1;
        if (!runningRelational.relations.some(r => r.name === otraTablaNombre)) {
            runningRelational.relations.push(otraTablaStudent);
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

    // ====================================================================
    // 🛠️ ADAPTADO A TU SISTEMA: El lado 1 recibe la clave del lado N
    // ====================================================================
    // TABLA DESTINO (La que recibe la FK según tu plataforma): Lado 1
    const studentTableDestino = studentRelational.relations.find(r => r.name === role1.entityName);
    
    // TABLA ORIGEN (De donde viene la PK): Lado N
    const tableOrigenER = runningRelational.relations.find(r => r.name === roleN.entityName);

    if (!studentTableDestino || !tableOrigenER) return null;

    // 1. VALIDAR ATRIBUTOS (La PK de N debe estar en la tabla de 1)
    const pksOrigen = tableOrigenER.attributes.filter(a => a.isPK);
    if (pksOrigen.length === 0) return null; // Esperamos a que la tabla origen tenga PK
    
    for (const pk of pksOrigen) {
        const foundInDestino = studentTableDestino.attributes.find(sa => sa.name.toLowerCase() === pk.name.toLowerCase());
        
        if (!foundInDestino) {
            return { 
                isCorrect: false, 
                message: `Falta la clave '${pk.name}' de '${roleN.entityName}' en la tabla '${role1.entityName}'.` 
            };
        }

        foundInDestino.isValidated = true; // Sello mágico de aprobación para el validador general
        
        if (foundInDestino.isPK) {
            return { 
                isCorrect: false, 
                message: `ERROR: '${pk.name}' no debe ser PK en la tabla '${role1.entityName}' (es una relación 1:N).` 
            };
        }
    }

    // 2. VALIDAR LA FLECHA DE LA CLAVE AJENA (FK)
    const tieneFK = studentTableDestino.fks.find(f => f.targetRelation.toLowerCase().trim() === roleN.entityName.toLowerCase().trim());
    if (!tieneFK) {
        return { 
            isCorrect: false, 
            message: `Falta la flecha de Clave Foránea (FK) desde '${role1.entityName}' hacia '${roleN.entityName}'.` 
        };
    }

    // --- BLINDAJE CON EL ARRAY ATTRIBUTES[0] ---
    const origenDetectadoFK = tieneFK.attributes && tieneFK.attributes[0];
    if (!origenDetectadoFK) {
        return {
            isCorrect: false,
            message: `ERROR: La FK en '${studentTableDestino.name}' debe estar vinculada al atributo '${pksOrigen[0].name}'.`
        };
    }

    // Comprobamos de forma estricta que el alumno clickeó el campo correcto
    const pkEsperadaNombre = pksOrigen[0].name.toLowerCase().trim();
    if (origenDetectadoFK.toString().toLowerCase().trim() !== pkEsperadaNombre) {
        return {
            isCorrect: false,
            message: `Error de asignación: La FK hacia '${roleN.entityName}' debe aplicarse sobre el atributo '${pksOrigen[0].name}', no sobre '${origenDetectadoFK}'.`
        };
    }

    tieneFK.isValidated = true;

    // 3. VALIDAR ATRIBUTOS DEL ROMBO (R1) - Viajan también a la tabla destino (Lado 1)
    const resAttributes = Mapper.mapRelationshipAttributes(baseER, studentRelational, runningRelational, rel, studentTableDestino);
    if (resAttributes && !resAttributes.isCorrect) return resAttributes;

    // ====================================================================
    // ✨ REGISTRO EN EL RUNNING (Para que el validador general acepte los cambios)
    // ====================================================================
    const idxRunning = runningRelational.relations.findIndex(r => r.name === studentTableDestino.name);
    if (idxRunning !== -1) {
        runningRelational.relations[idxRunning] = studentTableDestino;
    } else {
        runningRelational.relations.push(studentTableDestino);
    }

    // Aseguramos que la otra tabla (Lado N) también quede registrada en las aprobadas
    const studentTableOrigen = studentRelational.relations.find(r => r.name === roleN.entityName);
    if (studentTableOrigen && !runningRelational.relations.some(r => r.name === studentTableOrigen.name)) {
        runningRelational.relations.push(studentTableOrigen);
    }
    // ====================================================================

    // FINAL: Si todo está bien, borramos la relación para limpiar el mapa
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
             
                
            
            if (!foundInTable || !foundInTable.isPK) {
                    return { 
                        isCorrect: false, 
                        message: `ERROR: La tabla '${rel.label}' debe tener '${pk.name}' como parte de su Clave Primaria.` 
                    };
                }
            foundInTable.isValidated=true;
        
            };
            // 2. VALIDAR FK (La flechita hacia cada participante)
           const tieneFK = studentTable.fks.find(f => f.targetRelation === participant.entityName);
            if (!tieneFK) {
                return { 
                    isCorrect: false, 
                    message: `ERROR: En la relación '${rel.label}', falta la clave foránea (FK) apuntando a '${participant.entityName}'.` 
                };
            }
            tieneFK.isValidated=true;
            // --- 🛡️ BLINDAJE DE LA FK REESCRITO (Usa el array real attributes[0]) ---
        const origenDetectadoFK = tieneFK.attributes && tieneFK.attributes[0];
        const pkEsperadaNombre = pksDelER[0] ? pksDelER[0].name : "";

        if (!origenDetectadoFK) {
            return {
                isCorrect: false,
                message: `ERROR: La FK hacia '${participant.entityName}' en la tabla '${rel.label}' debe estar vinculada al atributo '${pkEsperadaNombre}'.`
            };
        }

        // Validamos si el alumno vinculó la FK en el atributo correcto de la tabla intermedia
        if (origenDetectadoFK.toString().toLowerCase().trim() !== pkEsperadaNombre.toLowerCase().trim()) {
            return {
                isCorrect: false,
                message: `Error de diseño en '${rel.label}': La FK hacia '${participant.entityName}' debe nacer del atributo '${pkEsperadaNombre}', no de '${origenDetectadoFK}'.`
            };
        }

        tieneFK.isValidated = true;
        }
        
        
        runningRelational.relations.push(studentTable);
        // Atributos del rombo (si tuviera)
        return Mapper.mapRelationshipAttributes(baseER, studentRelational, runningRelational, rel, studentTable);
        
    }
    
    static mapSpecializations(baseER, studentRelational, runningRelational) {
    // --- 1. FUSIÓN INTELIGENTE (Detecta Unión aunque el JSON venga al revés) ---
    const mergedSpecs = [];
    let specsCopy = [...baseER.specializations];

    while (specsCopy.length > 0) {
        let current = specsCopy.shift();
        
        let madreJSON = (Array.isArray(current.superclassEntityName) ? current.superclassEntityName[0] : current.superclassEntityName).toString().trim();
        let hijasJSON = (Array.isArray(current.subclassEntityNames) ? current.subclassEntityNames : [current.subclassEntityNames]);

        let indexOtra = specsCopy.findIndex(s => {
            let sMadre = Array.isArray(s.superclassEntityName) ? s.superclassEntityName[0] : s.superclassEntityName;
            return sMadre.toString().trim() === madreJSON;
        });

        if (indexOtra !== -1) {
            let otra = specsCopy.splice(indexOtra, 1)[0];
            let masHijas = Array.isArray(otra.subclassEntityNames) ? otra.subclassEntityNames : [otra.subclassEntityNames];
            
            current.subclassEntityNames = [...hijasJSON, ...masHijas];
            specsCopy.unshift(current);
            continue; 
        }

        // --- EL FILTRO CRÍTICO ---
        if (current.subclassEntityNames.length > 1) {
            const nombreHija1 = current.subclassEntityNames[0];
            const entidadHija1 = baseER.entities.find(e => e.name.toLowerCase() === nombreHija1.toLowerCase());
            
            if (entidadHija1 && entidadHija1.attributes.some(a => a.isKey)) {
                let aux = current.superclassEntityName;
                current.superclassEntityName = current.subclassEntityNames; // Pasan a ser superclases
                current.subclassEntityNames = aux; // Pasa a ser subclase
                console.log("Detectada Unión Invertida: Girando nombres...");
            }
        }

        mergedSpecs.push(current);
    }
    baseER.specializations = mergedSpecs;
    console.log("ESPECIALIZACIONES TRAS FUSIÓN:", JSON.stringify(baseER.specializations));

    // --- 2. PROCESAMIENTO PRINCIPAL ---
    for (let i = 0; i < baseER.specializations.length; i++) {
        const spec = baseER.specializations[i];
        const superNamesSpecs = Array.isArray(spec.superclassEntityName) 
            ? spec.superclassEntityName 
            : [spec.superclassEntityName];

        const esMultiple = superNamesSpecs.length > 1;

        if (esMultiple) {
            let supersRaw = superNamesSpecs;
            let subsRaw = Array.isArray(spec.subclassEntityNames) ? spec.subclassEntityNames : [spec.subclassEntityNames];

            let subName, finalSuperNames;

            // --- EL TRUCO PARA DESEMPATAR ---
            if (supersRaw.length === 1 && subsRaw.length > 1) {
                subName = supersRaw[0];    
                finalSuperNames = subsRaw;      
            } else {
                subName = subsRaw[0];      
                finalSuperNames = supersRaw;
            }

            // --- RE-VALIDACIÓN MANUAL ---
            const esPadreReal = baseER.entities.find(e => e.name === subName && e.attributes.some(a => a.isKey));
            if (esPadreReal && finalSuperNames.length > 0) {
                const temp = subName;
                subName = finalSuperNames[0]; 
                finalSuperNames = [temp, ...finalSuperNames.slice(1)];
            }

            const subTable = studentRelational.relations.find(r => r.name.toLowerCase() === subName.toLowerCase());
            if (!subTable) return { isCorrect: false, message: `Falta la tabla '${subName}'.` };

            // COGEMOS LAS PKs DE LOS PADRES
            const pksPadres = [];
            finalSuperNames.forEach(pName => {
                const ent = baseER.entities.find(e => e.name.toLowerCase() === pName.toLowerCase());
                const pk = ent?.attributes?.find(a => a.isKey);
                if (pk) pksPadres.push(pk.name.toLowerCase().trim());
            });

            const todasPksIguales = pksPadres.length > 1 && pksPadres.every(p => p === pksPadres[0]);

            if (todasPksIguales) {
                // --- CASO: PKs IGUALES (HERENCIA MULTIPLE) ---
                const nombrePkHeredada = pksPadres[0];
                const pkHeredada = subTable.attributes.find(a => a.name.toLowerCase() === nombrePkHeredada && a.isPK);

                if (!pkHeredada) {
                    return { isCorrect: false, message: `La tabla '${subName}' debe heredar la PK '${nombrePkHeredada}'.` };
                }
                pkHeredada.isValidated = true;

                for (const pName of finalSuperNames) {
                    const tieneFK = subTable.fks?.find(f => f.targetRelation.toLowerCase() === pName.toLowerCase());
                    if (tieneFK) {
                        tieneFK.isValidated = true;
                    } else {
                        return { isCorrect: false, message: `La tabla '${subName}' necesita una FK hacia '${pName}'.` };
                    }
                }
            } else {
                // --- CASO: CATEGORIZACIÓN (PKs DISTINTAS o UNIÓN) ---
                const pkPropia = subTable.attributes.find(a => a.isPK);
                if (!pkPropia) {
                    return { isCorrect: false, message: `En una unión, la tabla '${subName}' necesita su propia clave primaria.` };
                }
                pkPropia.isValidated = true;

                for (const pName of finalSuperNames) {
                    const tablaPadre = studentRelational.relations.find(r => r.name.toLowerCase() === pName.toLowerCase());
                    if (!tablaPadre) return { isCorrect: false, message: `Falta la tabla '${pName}'.` };

                    const tieneFK = tablaPadre.fks?.find(f => f.targetRelation.toLowerCase() === subName.toLowerCase());
                    if (tieneFK) {
                        tieneFK.isValidated = true;
                        const attrEnPadre = tablaPadre.attributes.find(a => a.name.toLowerCase() === pkPropia.name.toLowerCase());
                        if (attrEnPadre) attrEnPadre.isValidated = true;
                    } else {
                        return { isCorrect: false, message: `La tabla '${pName}' debe tener una FK hacia '${subName}'.` };
                    }
                }
            }

            // Validar atributos normales (C1...)
            const entidadC = baseER.entities.find(e => e.name.toLowerCase() === subName.toLowerCase());
            entidadC?.attributes?.forEach(attrER => {
                const found = subTable.attributes.find(a => a.name.toLowerCase() === attrER.name.toLowerCase());
                if (found) found.isValidated = true;
            });

            if (!runningRelational.relations.find(r => r.name === subTable.name)) {
                runningRelational.relations.push(subTable);
            }
            baseER.specializations.splice(i, 1);
            i--;
            continue;
        } else {
            // --- HERENCIA NORMAL (1 Madre -> N Hijas) ---
            const superName = superNamesSpecs[0];
            const superEntity = baseER.entities.find(e => e.name.toLowerCase() === superName.toLowerCase());
            if (!superEntity) continue;

            const tableMadre = studentRelational.relations.find(r => r.name.toLowerCase() === superName.toLowerCase());
            const tableHijas = studentRelational.relations.filter(r => 
                spec.subclassEntityNames.map(name => name.toLowerCase()).includes(r.name.toLowerCase())
            );

            if (!tableMadre && tableHijas.length === 0) {
                if (spec.isTotal) {
                    return { isCorrect: false, message: `Faltan las tablas para la especialización total de '${superName}' (puedes crear las tablas hijas '${spec.subclassEntityNames.join(', ')}' o una tabla única).` };
                } else {
                    return { isCorrect: false, message: `Falta la tabla para la entidad '${superName}'.` };
                }
            }

            // --- DETECTAR SI EL ALUMNO QUIERE USAR ESTRATEGIA C (TABLA ÚNICA) ---
            const atributosHijasEnMadre = spec.subclassEntityNames.some(subName => {
                const subER = baseER.entities.find(e => e.name.toLowerCase() === subName.toLowerCase());
                return subER && subER.attributes.some(attrH => 
                    tableMadre && tableMadre.attributes.some(a => a.name.toLowerCase() === attrH.name.toLowerCase())
                );
            });

            if (atributosHijasEnMadre || (tableMadre && tableHijas.length === 0)) {
                if (tableHijas.length > 0) {
                    return { isCorrect: false, message: `Error de diseño: Si usas Tabla Única en '${tableMadre.name}', no deben existir tablas como '${tableHijas[0].name}'.` };
                }

                for (const attr of superEntity.attributes) {
                    const found = tableMadre.attributes.find(a => a.name.toLowerCase() === attr.name.toLowerCase());
                    if (!found) return { isCorrect: false, message: `Falta '${attr.name}' en la tabla '${tableMadre.name}'.` };
                    if (attr.isKey && !found.isPK) return { isCorrect: false, message: `'${attr.name}' debe ser PK.` };
                    found.isValidated = true;
                }

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

                if (!spec.allowsOverlapping || spec.allowsOverlapping) {
                    const disc = tableMadre.attributes.find(a => !a.isValidated && !a.isFK);
                    if (!disc) {
                        return { isCorrect: false, message: `La especialización es disjunta ('d'). La tabla única '${tableMadre.name}' necesita un atributo discriminador (ej. 'Tipo').` };
                    }
                    disc.isValidated = true;
                }

                // Finalización limpia para Estrategia C
                if (!runningRelational.relations.find(r => r.name === tableMadre.name)) {
                    runningRelational.relations.push(tableMadre);
                }
                const namesToFilter = [superName.toLowerCase(), ...spec.subclassEntityNames.map(n => n.toLowerCase())];
                baseER.entities = baseER.entities.filter(e => !namesToFilter.includes(e.name.toLowerCase()));
                baseER.specializations.splice(i, 1);
                i--;
                continue;
            }

            // --- ESTRATEGIA A: TABLA PARA CADA ENTIDAD ---
            if (tableMadre && tableHijas.length > 0) {
                for (const attr of superEntity.attributes) {
                    const found = tableMadre.attributes.find(a => a.name.toLowerCase() === attr.name.toLowerCase());
                    if (!found) return { isCorrect: false, message: `Falta el atributo '${attr.name}' en la tabla '${tableMadre.name}'.` };
                    if (attr.isKey && !found.isPK) return { isCorrect: false, message: `El atributo '${attr.name}' debe ser PK en '${tableMadre.name}'.` };
                    found.isValidated = true;
                }

                for (const subName of spec.subclassEntityNames) {
                    const subTable = studentRelational.relations.find(r => r.name.toLowerCase() === subName.toLowerCase());
                    if (!subTable) return { isCorrect: false, message: `Falta la tabla para la subclase '${subName}'.` };
                    
                    const pkMadreER = superEntity.attributes.find(a => a.isKey);
                    const pkHija = subTable.attributes.find(a => a.name.toLowerCase() === pkMadreER.name.toLowerCase());

                    if (!pkHija || !pkHija.isPK) {
                        return { isCorrect: false, message: `La tabla hija '${subTable.name}' debe tener la PK de la madre ('${pkMadreER.name}') como su propia PK.` };
                    }
                    pkHija.isValidated = true;

                    const fks = subTable.fks || [];
                    const relacionFK = fks.find(f => f.targetRelation.toLowerCase().trim() === superName.toLowerCase().trim());

                    if (!relacionFK) {
                        return { isCorrect: false, message: `El atributo '${pkMadreER.name}' en la tabla '${subTable.name}' debe estar marcado como Clave Ajena (FK) hacia la madre '${superName}'.` };
                    }

                    const nombreOrigenFK = relacionFK.attributes && relacionFK.attributes[0];
                    if (nombreOrigenFK && nombreOrigenFK.toString().toLowerCase().trim() !== pkMadreER.name.toLowerCase().trim()) {
                        return {
                            isCorrect: false,
                            message: `Error de diseño en la tabla '${subTable.name}': La FK hacia '${superName}' debe nacer del atributo heredado '${pkMadreER.name}', no de '${nombreOrigenFK}'.`
                        };
                    }

                    relacionFK.isValidated = true;

                    const subEntityER = baseER.entities.find(e => e.name.toLowerCase() === subName.toLowerCase());
                    if (subEntityER) {
                        for (const attrPropio of subEntityER.attributes) {
                            const found = subTable.attributes.find(a => a.name.toLowerCase() === attrPropio.name.toLowerCase());
                            if (!found) return { isCorrect: false, message: `Falta el atributo propio '${attrPropio.name}' en la tabla '${subTable.name}'.` };
                            if (found.isPK && !attrPropio.isKey) return { isCorrect: false, message: `El atributo '${found.name}' en '${subTable.name}' no debería ser PK.` };
                            found.isValidated = true;
                        }
                    }
                    if (!runningRelational.relations.find(r => r.name === subTable.name)) runningRelational.relations.push(subTable);
                }

                if (!runningRelational.relations.find(r => r.name === tableMadre.name)) runningRelational.relations.push(tableMadre);
                baseER.entities = baseER.entities.filter(e => 
                    e.name.toLowerCase() !== superName.toLowerCase() && 
                    !spec.subclassEntityNames.map(n => n.toLowerCase()).includes(e.name.toLowerCase())
                );
                baseER.specializations.splice(i, 1);
                i--;
                continue;
            }

            // --- ESTRATEGIA B: SOLO TABLAS PARA LAS HIJAS ---
            else if (!tableMadre && tableHijas.length > 0) {
                if (!spec.isTotal) {
                    return { isCorrect: false, message: `Error: No puedes eliminar la tabla madre '${spec.superclassEntityName}' porque la especialización es parcial (una línea). Debes usar la Estrategia A (todas las tablas) o la C (tabla única).` };
                }
                
                let todasHijasDibujadas = true;
                for (const subName of spec.subclassEntityNames) {
                    const subTable = studentRelational.relations.find(r => r.name.toLowerCase() === subName.toLowerCase());
                    if (!subTable) {
                        todasHijasDibujadas = false;
                        break;
                    }

                    for (const attr of superEntity.attributes) {
                        const found = subTable.attributes.find(a => a.name.toLowerCase() === attr.name.toLowerCase());
                        if (!found) return { isCorrect: false, message: `Al no haber tabla madre (herencia total), '${subTable.name}' debe incluir el atributo heredado '${attr.name}'.` };
                        if (attr.isKey && !found.isPK) return { isCorrect: false, message: `'${attr.name}' debe ser PK en '${subTable.name}'.` };
                        found.isValidated = true;
                    }

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
                        e.name.toLowerCase() !== superName.toLowerCase() && 
                        !spec.subclassEntityNames.map(n => n.toLowerCase()).includes(e.name.toLowerCase())
                    );
                    baseER.specializations.splice(i, 1);
                    i--;
                    continue;
                }
            }
        }
    }
    return null; // El validador sigue su curso si todo es correcto
}

    static mapCategories(baseER, studentRelational, runningRelational) {
    // --- PASO 0: REPARACIÓN FORZOSA DEL JSON ---
    // Si el alumno subrayó algo en la tabla, nos aseguramos de que el ER diga que es Key
    baseER.entities.forEach(ent => {
        const tablaAlumno = studentRelational.relations.find(r => r.name.toUpperCase() === ent.name.toUpperCase());
        if (tablaAlumno) {
            tablaAlumno.attributes.forEach(attrTab => {
                if (attrTab.isPK) {
                    const attrER = ent.attributes.find(a => a.name.toUpperCase() === attrTab.name.toUpperCase());
                    if (attrER) attrER.isKey = true; // Forzamos la verdad del dibujo en el dato
                }
            });
        }
    });

    for (let i = 0; i < baseER.categories.length; i++) {
        const cat = baseER.categories[i];
        const superNames = cat.superclassEntityName || []; 
        const subName = cat.categoryEntityName;

        const subTable = studentRelational.relations.find(r => r.name.toUpperCase().trim() === subName.toUpperCase().trim());
        if (!subTable) return { isCorrect: false, message: `Falta la tabla para la categoría '${subName}'.` };

        const entidadP = baseER.entities.find(e => e.name.toUpperCase().trim() === subName.toUpperCase().trim());

        // --- 1. RECOLECTAR PKs DE PADRES ---
        let listaPksPadres = []; 
        superNames.forEach(pName => {
            const padreER = baseER.entities.find(e => e.name.toUpperCase().trim() === pName.toUpperCase().trim());
            if (padreER) {
                const keys = padreER.attributes.filter(a => a.isKey).map(a => a.name.toLowerCase().trim());
                listaPksPadres.push(keys);
            }
        });

        // --- 2. ¿SON IGUALES? ---
        const primerasPks = listaPksPadres[0] || [];
        const sonIguales = listaPksPadres.length > 0 && listaPksPadres.every(pks => 
            pks.length === primerasPks.length && pks.every(k => primerasPks.includes(k))
        );

        // --- 3. BIFURCACIÓN DE LÓGICA ---
        if (sonIguales && primerasPks.length > 0) {
            // 2. Validar PK de la Categoría (P)
            // Usamos el "Paso 0" que ya arregló entidadP.attributes
            const pkPropiaER = entidadP?.attributes.find(a => a.isKey);

            if (pkPropiaER) {
                // Caso PK Propia (El alumno decidió ponerle una nueva a pesar de ser iguales)
                const pkTable = subTable.attributes.find(a => a.name.toLowerCase() === pkPropiaER.name.toLowerCase() && a.isPK);
                if (!pkTable) return { isCorrect: false, message: `La tabla '${subName}' debe tener su propia PK '${pkPropiaER.name}' subrayada.` };
                pkTable.isValidated = true;
            } else {
                // Caso PK Heredada (Lo más común cuando son iguales)
                // IMPORTANTE: Iteramos sobre 'primerasPks' que son los nombres (strings)
                for (const pkNombre of primerasPks) {
                    const foundHeredada = subTable.attributes.find(a => a.name.toLowerCase() === pkNombre.toLowerCase() && a.isPK);
                    if (!foundHeredada) {
                        return { isCorrect: false, message: `La tabla '${subName}' debe heredar la PK '${pkNombre}' de sus padres y marcarla como PK.` };
                    }
                    foundHeredada.isValidated = true;
                }
            }

            // Validar participación total (FK de padres a hija)
            if (cat.isTotal) {
                for (const pName of superNames) {
                   /* const tablaPadre = studentRelational.relations.find(r => r.name.toUpperCase().trim() === pName.toUpperCase().trim());
                    if (!tablaPadre) continue;

                    const tieneFK = tablaPadre.fks?.find(f => f.targetRelation.toUpperCase() === subName.toUpperCase());
                    if (!tieneFK) {
                        return { isCorrect: false, message: `La tabla padre '${pName}' debe tener una FK que apunte a la categoría '${subName}' (Participación Total).` };
                    }
                    tieneFK.isValidated = true;

                    // Si hay PK propia en la hija, validamos el atributo FK en el padre
                  /*  if (pkPropiaER) {
                        const attrFK = tablaPadre.attributes.find(a => a.name.toLowerCase() === pkPropiaER.name.toLowerCase());
                        if (attrFK) attrFK.isValidated = true;
                    }
                        // Buscamos el atributo físico que hace de puente en la tabla padre para validarlo
                    // Si la categoría tiene PK propia, el padre usa ese nombre. Si no, usa la PK común (primerasPks[0])
                    const nombreAtributoFK = pkPropiaER ? pkPropiaER.name.toLowerCase() : primerasPks[0];
                    const attrFK = tablaPadre.attributes.find(a => a.name.toLowerCase() === nombreAtributoFK);
                    if (attrFK) attrFK.isValidated = true;*/
                        const tablaPadre = studentRelational.relations.find(r => r.name.toUpperCase().trim() === pName.toUpperCase().trim());
                    if (!tablaPadre) continue;

                    // Averiguamos qué nombre de columna DEBERÍA tener la FK en el padre
                    const nombreAtributoEsperado = pkPropiaER ? pkPropiaER.name.toLowerCase() : primerasPks[0];

                    // 1. Buscamos el objeto físico del atributo en la tabla del padre
                    const fkEncontrada = tablaPadre.attributes.find(sa => sa.name.toLowerCase() === nombreAtributoEsperado.toLowerCase());
                    if (!fkEncontrada) {
                        return { 
                            isCorrect: false, 
                            message: `La clave '${nombreAtributoEsperado}' debe existir en la tabla padre '${tablaPadre.name}' como FK.` 
                        };
                    }
                    fkEncontrada.isValidated = true; 

                    // 2. VALIDACIÓN DE LA RELACIÓN DE CLAVE AJENA (FK) en el objeto fks del padre
                    const fkDefinida = tablaPadre.fks?.find(f => f.targetRelation.toLowerCase().trim() === subName.toLowerCase().trim());
                    if (!fkDefinida) {
                        return { 
                            isCorrect: false, 
                            message: `ERROR: Falta definir la Clave Foránea (FK) en la tabla padre '${tablaPadre.name}' apuntando a '${subName}'.` 
                        };
                    }

                    // 3. Extraemos de forma segura el atributo origen real (botón verde)
                    // Nota: Si tu JSON usa .attributes o .columns, adapta esta línea. Según tu ejemplo usas .attributes[0]
                    const origenDetectadoFK = fkDefinida.attributes && fkDefinida.attributes[0];
                    if (!origenDetectadoFK) {
                        return {
                            isCorrect: false,
                            message: `ERROR: La FK en la tabla '${tablaPadre.name}' debe estar vinculada al atributo '${nombreAtributoEsperado}'.`
                        };
                    }

                    // 4. Validamos que el botón verde apunte estrictamente al campo correcto
                    if (origenDetectadoFK.toString().toLowerCase().trim() !== nombreAtributoEsperado.toLowerCase().trim()) {
                        return {
                            isCorrect: false,
                            message: `Error de diseño en '${tablaPadre.name}': La FK hacia '${subName}' debe nacer del atributo '${nombreAtributoEsperado}', no de '${origenDetectadoFK}'.`
                        };
                    }

                    fkDefinida.isValidated = true;
                }
            }
        } else {
            // CASO B: UNIÓN DE CLAVES DISTINTAS (P tiene su propia PK)
            const pkPropiaTable = subTable.attributes.find(a => a.isPK);
            if (!pkPropiaTable) return { isCorrect: false, message: `La tabla '${subName}' necesita su propia PK subrayada.` };
            
            pkPropiaTable.isValidated = true;

            // Validar que los padres tengan la FK hacia P
            for (const pName of superNames) {
             /*   const tablaPadre = studentRelational.relations.find(r => r.name.toUpperCase().trim() === pName.toUpperCase().trim());
                if (!tablaPadre) continue;
                
                // --- NUEVO: EXIGIR PK EN EL PADRE ---
                const pkPadre = tablaPadre.attributes.find(a => a.isPK);
                if (!pkPadre) {
                    return { isCorrect: false, message: `La tabla padre '${pName}' debe tener su propia clave primaria (PK) subrayada.` };
                }

               const tieneFK = tablaPadre.fks?.find(f => f.targetRelation.toUpperCase() === subName.toUpperCase());
                if (!tieneFK) return { isCorrect: false, message: `El padre '${pName}' debe tener una FK hacia '${subName}'.` };
                
                tieneFK.isValidated = true;
                // Marcamos como validado el atributo que hace de FK en el padre
                const attrFK = tablaPadre.attributes.find(a => a.name.toLowerCase().trim() === pkPropiaTable.name.toLowerCase().trim());
                if (attrFK) attrFK.isValidated = true;*/
                const tablaPadre = studentRelational.relations.find(r => r.name.toUpperCase().trim() === pName.toUpperCase().trim());
                if (!tablaPadre) continue;
                
                const pkPadre = tablaPadre.attributes.find(a => a.isPK);
                if (!pkPadre) {
                    return { isCorrect: false, message: `La tabla padre '${pName}' debe tener su propia clave primaria (PK) subrayada.` };
                }

                // El nombre correcto que debe tener la FK en el padre es la PK de la hija ('K')
                const nombreAtributoEsperado = pkPropiaTable.name.toLowerCase().trim();

                // 1. Buscamos el objeto físico del atributo en la tabla del padre
                const fkEncontrada = tablaPadre.attributes.find(sa => sa.name.toLowerCase() === nombreAtributoEsperado.toLowerCase());
                if (!fkEncontrada) {
                    return { 
                        isCorrect: false, 
                        message: `La clave '${nombreAtributoEsperado}' de la categoría debe viajar a la tabla padre '${tablaPadre.name}' como FK.` 
                    };
                }
                fkEncontrada.isValidated = true;

                // 2. VALIDACIÓN DE LA RELACIÓN DE CLAVE AJENA (FK) en la tabla padre apuntando a la categoría
                const fkDefinida = tablaPadre.fks?.find(f => f.targetRelation.toLowerCase().trim() === subName.toLowerCase().trim());
                if (!fkDefinida) {
                    return { 
                        isCorrect: false, 
                        message: `ERROR: Falta definir la Clave Foránea (FK) en '${tablaPadre.name}' apuntando a la categoría '${subName}'.` 
                    };
                }

                // 3. Extraemos de forma segura el atributo origen real (botón verde)
                const origenDetectadoFK = fkDefinida.attributes && fkDefinida.attributes[0];
                if (!origenDetectadoFK) {
                    return {
                        isCorrect: false,
                        message: `ERROR: La FK en la tabla '${tablaPadre.name}' debe estar vinculada al atributo '${nombreAtributoEsperado}'.`
                    };
                }

                // 4. Validamos que el botón verde apunte estrictamente al campo correcto
                if (origenDetectadoFK.toString().toLowerCase().trim() !== nombreAtributoEsperado.toLowerCase().trim()) {
                    return {
                        isCorrect: false,
                        message: `Error de diseño en '${tablaPadre.name}': La FK hacia '${subName}' debe nacer del atributo '${nombreAtributoEsperado}', no de '${origenDetectadoFK}'.`
                    };
                }

                fkDefinida.isValidated = true;
                    
            }
        }

        // 4. Validar atributos normales y limpiar
        entidadP?.attributes.forEach(a => {
            const f = subTable.attributes.find(sa => sa.name.toLowerCase().trim() === a.name.toLowerCase().trim());
            if (f) f.isValidated = true;
        });

        if (!runningRelational.relations.find(r => r.name === subTable.name)) runningRelational.relations.push(subTable);
        baseER.categories.splice(i, 1);
        i--;
    }
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
