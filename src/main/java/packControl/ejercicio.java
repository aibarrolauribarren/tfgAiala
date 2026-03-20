/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package packControl;

import java.sql.Date;

/**
 *
 * @author quick
 */
public class ejercicio {
    private boolean completado;
    private int id;
    private boolean eval;
    private Date date;
    
    public ejercicio( int id, boolean completado, boolean eval, Date date){
        this.completado=completado;
        this.id= id;
        this.eval=eval;
        this.date=date;
    }
    
    
    public boolean isCompletado(){
        return completado;
    }
    
    public int getId(){
        return id;
    }
    
    public boolean isEval(){
        return eval;
    }
    
    public Date getDate(){
        return date;
    }
}
