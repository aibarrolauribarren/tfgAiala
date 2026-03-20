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
public class ejercicioEvalAlum {
    
    private int id;
    private Date date;
    private boolean complet;
    
    public ejercicioEvalAlum(int id, Date date, boolean complet){
        this.id=id;
        this.date=date;
        this.complet=complet;
    }
    
    public int getId(){
        return id;
    }
     
    
    public Date getDate(){
        return date;
    }
    
    public boolean getComplet(){
        return complet;
    }
    
   
    
}

