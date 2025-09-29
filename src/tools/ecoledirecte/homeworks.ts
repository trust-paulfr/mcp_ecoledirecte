import { z } from 'zod';
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js"

class HomeWorks {
    public static moduleName = 'EcoleDirecte.Task';
    public static moduleDescription = "Get the homeworks from EcoleDirecte";
    public static moduleArguments = {
        Upcomingtasks: z.boolean().describe("Si true, récupère les tâches à venir. Si false, récupère les taches à faire d'une date précise."),
        dateTask: z.string().describe("Date précise au format YYYY-MM-DD. Nécessaire si Upcomingtasks est false.)"),
    };

    // @ts-ignore
    public static async execute({Upcomingtasks, dateTask}: z.infer<typeof HomeWorks.moduleArguments>): Promise<CallToolResult> {
        const TOKEN = "";
        const ELEVES_ID = process.env.ECOLE_DIRECTE_ELEVE_ID;
        let URL = `https://api.ecoledirecte.com/v3/Eleves/${ELEVES_ID}/cahierdetexte.awp?verbe=get&v=4.85.1`;

        console.log(Upcomingtasks, dateTask);
        if (!Upcomingtasks) {
            URL = `https://api.ecoledirecte.com/v3/Eleves/3177/cahierdetexte/${dateTask}.awp?verbe=get&v=4.85.1`;
        }

        console.log(URL);

        try {
            const taskResp = await fetch(URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Token': TOKEN,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
                },
                body: "data=" + JSON.stringify({
                })
            });

            const taskJson = await taskResp.json();
            console.log(taskJson);
            const taskData = taskJson.data;

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({schedule: taskData}, null, 2)
                    }
                ]
            };
        } catch (error) {
            console.error("Error in get_task tool:", error);
            return {
                content: [
                    // @ts-ignore
                    { type: 'text', text: `Erreur lors de la récupération de l'emploi du temps: ${error.message}` }
                ]
            };
        }
    }
}

export default HomeWorks;