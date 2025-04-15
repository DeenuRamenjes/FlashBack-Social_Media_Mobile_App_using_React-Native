import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix"
import { api } from "./_generated/api";


const http = httpRouter()

http.route({
    path:"/clerk-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
        if(!webhookSecret){
            throw new Error("CLERK_WEBHOOK_SECRET is not defined")
        }

        // Get the headers
        const svixId = request.headers.get("svix-id");
        const svixTimestamp = request.headers.get("svix-timestamp");
        const svixSignature = request.headers.get("svix-signature");

        // Check if all required headers are present
        if(!svixId || !svixTimestamp || !svixSignature){
            console.error("Missing required headers:", { svixId, svixTimestamp, svixSignature })
            return new Response("Error Occurred - no svix headers", { 
                status: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            })
        }

        const payload = await request.json()
        const body = JSON.stringify(payload)

        const wh = new Webhook(webhookSecret)
        let evt:any

        try{
            evt = wh.verify(body, {
                "svix-id": svixId,
                "svix-timestamp": svixTimestamp,
                "svix-signature": svixSignature
            }) as any
        }
        catch(e){
            console.error("Error in validating svix signature", e)
            return new Response("Error Occurred - invalid svix signature", { 
                status: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            })
        }

        const eventType = evt.type

        if(eventType === "user.created"){
            const {id, email_addresses, first_name, last_name, image_url} = evt.data
            const email = email_addresses[0].email_address
            const name = `${first_name || ""} ${last_name || ""}`.trim()

            try {
                await ctx.runMutation(api.users.createUser,{
                    email,
                    fullname: name,
                    image: image_url,
                    clerkId: id,
                    username: email.split("@")[0]
                })
            } catch (error) {
                console.error("Error in creating user", error)
                return new Response("Error Occurred - unable to create user", { 
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                })
            }
        }
        return new Response("Webhook processed successfully", { 
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        })
    })
})


export default http