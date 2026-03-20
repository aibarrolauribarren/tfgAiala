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
public class ejercicioEval {
    private int id;
    private Date date;
    
    public ejercicioEval(int id, Date date){
        this.id=id;
        this.date=date;
    }
    
    public int getId(){
        return id;
    }
    
    public Date getDate(){
        return date;
    }
    
   
    
}
