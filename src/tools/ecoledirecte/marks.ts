import { z } from 'zod';
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js"

class Marks {
    public static moduleName = 'EcoleDirecte.Marks';
    public static moduleDescription = "Get all marks of the actual semester from EcoleDirecte";
    public static moduleArguments = {};

    // @ts-ignore
    public static async execute({dateDebut, dateFin}: z.infer<typeof Marks.moduleArguments>): Promise<CallToolResult> {
        const TOKEN = "";
        const ELEVES_ID = process.env.ECOLE_DIRECTE_ELEVE_ID;
        const URL = `https://api.ecoledirecte.com/v3/eleves/${ELEVES_ID}/notes.awp?verbe=get&v=4.85.1`;

        try {
            const marksResponse = await fetch(URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Token': TOKEN,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
                },
                body: "data=" + JSON.stringify({
                    anneeScolaire: ""
                })
            });

            const marksJson = await marksResponse.json();
            const notesData = marksJson.data;

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({schedule: notesData}, null, 2)
                    }
                ]
            };
        } catch (error) {
            console.error("Error in get_marks tool:", error);
            return {
                content: [
                    // @ts-ignore
                    { type: 'text', text: `Erreur lors de la récupération des notes: ${error.message}` }
                ]
            };
        }
    }
}

export default Marks;