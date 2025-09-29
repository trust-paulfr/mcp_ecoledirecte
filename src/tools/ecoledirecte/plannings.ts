import { z } from 'zod';
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js"

class Plannings {
   public static moduleName = 'EcoleDirecte.Plannings';
   public static moduleDescription = "Get the emploi du temps from EcoleDirecte between two dates";
   public static moduleArguments = {
       dateDebut: z.string().describe("Date de début au format YYYY-MM-DD"),
       dateFin: z.string().describe("Date de fin au format YYYY-MM-DD"),
   };

   // @ts-ignore
    public static async execute({dateDebut, dateFin}: z.infer<typeof Plannings.moduleArguments>): Promise<CallToolResult> {
       const TOKEN = "";
       const ELEVES_ID = process.env.ECOLE_DIRECTE_ELEVE_ID;
       const URL = `https://api.ecoledirecte.com/v3/E/${ELEVES_ID}/emploidutemps.awp?verbe=get&v=4.85.1`;

       try {
           const scheduleResp = await fetch(URL, {
               method: 'POST',
               headers: {
                   'Content-Type': 'application/x-www-form-urlencoded',
                   'X-Token': TOKEN,
                   'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
               },
               body: "data=" + JSON.stringify({
                   dateDebut,
                   dateFin,
                   avecTrous: false
               })
           });

           const scheduleJson = await scheduleResp.json();
           const edt = scheduleJson.data;

           const courses = Array.isArray(edt) ? edt.map((cours: any) => ({
               id: cours.id,
               matiere: cours.matiere,
               prof: cours.prof,
               debut: cours.start_date,
               fin: cours.end_date,
               salle: cours.salle,
               typeCours: cours.typeCours,
               color: cours.color
           })) : [];

           return {
               content: [
                   {
                       type: 'text',
                       text: JSON.stringify({schedule: courses}, null, 2)
                   }
               ]
           };
       } catch (error) {
           console.error("Error in get_schedule tool:", error);
           return {
               content: [
                   // @ts-ignore
                   { type: 'text', text: `Erreur lors de la récupération de l'emploi du temps: ${error.message}` }
               ]
           };
       }
   }
}

export default Plannings;