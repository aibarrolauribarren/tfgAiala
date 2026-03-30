
export const messages = {
    CORRECT: {
        'es-ES': 'Perfecto!!'
    },
    DERIVATE_ATTRIBUTE_INCLUDED: {
        'es-ES': 'El atributo $0 del tipo de entidad $1 es un atributo derivado, por lo que no se incluye como atributo en la relación'
    },
    MISSING_RELATION: {
        'es-ES': 'Falta la relación $0'
    },
    MISSING_KEY_ATTRIBUTE: {
        'es-ES': 'Falta el atributo $0 en la relación $1'
    },
    MISSING_REGULAR_ATTRIBUTE: {
        'es-ES': 'Falta el atributo $0 en la relación $1'
    },
    MISSING_SUBATTRIBUTE_PART_OF_KEY: {
        'es-ES': 'Falta el atributo $0 en la relación $1'
    },
    MISSING_ATTRIBUTE_IN_PK: {
        'es-ES': 'El atributo $0 debería formar parte de la PK de la relación $1'
    },
    MISSING_WEAK_ENTITY_RELATION: {
        'es-ES': 'Falta la relación $0 fruto del tipo de entidad débil'
    }, 
    MISSING_MULTIVALUED_RELATION: {
        'es-ES': 'Falta la relación $0 fruto del atributo multivaluado $1'
    },
    MISSING_MULTIVALUED_RELATION_ENTITY_PK_ATTRIBUTE: {
        'es-ES': 'En la relación $0, falta incluir el atributo $1 por formar parte de la PK de la relación $2'
    },
    MISSING_MULTIVALUED_RELATION_ENTITY_PK: {
        'es-ES': 'En la relación $0, el atributo $1 debería formar parte de la PK'
    },
    WRONG_MULTIVALUED_FK: {
        'es-ES': 'En la relación $0 que surge como consecuencia de un atributo multivaluado, la FK a la relación $1 no está bien definida'
    },
    MISSING_MULTIVALUED_ATTRIBUTE_IN_RELATION: {
        'es-ES': 'En la relación $0 que surge como consecuencia de un atributo multivaluado, falta el atributo $1'
    },
    MISSING_MULTIVALUED_ATTRIBUTE_IN_RELATION_PK: {
        'es-ES': 'En la relación $0 que surge como consecuencia de un atributo multivaluado, el atributo $1 debería formar parte de la PK'
    },
    MISSING_PK: {
        'es-ES': 'La relación $0 no tiene PK'
    },
    WRONG_PK:{
        'es-ES': 'La PK de la relación $0 no está bien'
    },
    MISSING_FK: {
        'es-ES': 'Falta una FK en la relación $0 que haga referencia a la relación $1 para transformar el vínculo $2'
    }, 
    MISSING_FK_ATTR: {
        'es-ES': 'Para transformar el vínculo $0, la relación $1 debería incluir el atributo $2 al formar parte de la PK de $3'
    },
    MISSING_ATTR_IN_FK: {
        'es-ES': 'La FK de la relación $0 que hace referencia a $1 debería incluir el atributo $2'
    },
    MORE_ATTR_IN_FK: {
        'es-ES': 'La FK de la relación $0 que hace referencia a $1 tiene atributos de más'
    },
    MISSING_MN_RELATION: {
        'es-ES': 'El vínculo $0 es M:N, por lo que se transforma como una relación aparte'
    },
    MISSING_MN_RELATION_ATTRIBUTE: {
        'es-ES': 'La relación $0 debería incluir el atributo $2, al ser parte de la PK de $1'
    },
    MISSING_MN_RELATION_FK: {
        'es-ES': 'En la relación $0, falta una FK que haga referencia a $1'
    },
    MORE_MN_RELATION_FK_ATTRIBUTES: {
        'es-ES': 'En la relación $0, la FK que hace referencia a $1 tiene atributos de más'
    },
    MISSING_MN_RELATION_FK_ATTRIBUTE: {
        'es-ES': 'En la relación $0, en la FK que hace referencia a $1 falta el atributo $2'
    },
    MISSING_ATTRIBUTE_IN_MN_RELATION_PK: {
        'es-ES': 'En la relación $0, el atributo $1 debería formar parte de la PK'
    },
    MISSING_NARY_RELATION: {
        'es-ES': 'Para transformar el vínculo $0, es necesario crear una relación aparte'
    },
    MISSING_NARY_RELATION_ATTRIBUTE: {
        'es-ES': 'En la relación $0, falta el atributo $1 ya que forma parte de la PK de $2'
    },
    MISSING_NARY_RELATION_FK: {
        'es-ES': 'En la relación $0, falta una FK que haga referencia a $1'
    },
    MISSING_NARY_RELATION_FK_ATTRIBUTES: {
        'es-ES': 'En la relación $0, en la FK que hace referencia a $1 falta el atributo $2'
    },
    MORE_NARY_RELATION_FK_ATTRIBUTES: {
        'es-ES': 'En la relación $0, la FK que hace referencia a $1 tiene atributos de más'
    },
    MISSING_SUPERCLASS_RELATION: {
        'es-ES': 'Falta la relacion de la superclase $0'
    },
    MISSING_SUBCLASS_RELATION: {
        'es-ES': 'Falta la relacion de la subclase $0'
    },
    MISSING_PK_IN_SUBCLASS: {
        'es-ES': 'Falta el atributo de clave primaria $1 en la subclase $0'
    },
    PK_NOT_MARKED_IN_SUBCLASS: {
        'es-ES': 'El atributo $1 debe ser clave primaria en la subclase $0'
    },
    MISSING_FK_IN_SUBCLASS: {
        'es-ES': 'Falta la clave foranea en $0 hacia $1'
    },
    WRONG_FK_IN_SUBCLASS: {
        'es-ES': 'La clave foranea en $0 no incluye el atributo $1'
    }
    
    
}