import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { clients, packageContracts, packagePlans, services } from "../../../db/schema";
import { getManager } from "../../../lib/auth";
import { serviceCatalog } from "../../service-catalog";

async function syncOfficialPackages(organizationId:string){
  const db=getDb();
  const official=serviceCatalog.filter(item=>item.category==="fidelidade");
  for(const item of official){
    await db.insert(services).values({organizationId,name:item.name,groupName:item.group,category:item.category,detail:item.detail,duration:item.duration,priceCents:Math.round(item.price*100),sessions:item.sessions,visitsJson:item.visits?JSON.stringify(item.visits):null,active:true}).onConflictDoNothing({target:[services.organizationId,services.name]});
  }
  const [existingPlans,serviceRows]=await Promise.all([
    db.select({name:packagePlans.name}).from(packagePlans).where(eq(packagePlans.organizationId,organizationId)),
    db.select().from(services).where(eq(services.organizationId,organizationId)),
  ]);
  const registered=new Set(existingPlans.map(item=>item.name));
  for(const item of official){
    if(registered.has(item.name))continue;
    const service=serviceRows.find(row=>row.name===item.name);
    if(!service)continue;
    const quinzenal=/quinzen/i.test(item.name);
    await db.insert(packagePlans).values({organizationId,name:item.name,sessions:item.sessions,periodicity:quinzenal?"Quinzenal":"Semanal",validityDays:quinzenal?70:35,priceCents:Math.round(item.price*100),serviceId:service.id,courtesy:"Sem cortesia",active:true});
  }
}

export async function GET() {
  const manager=await getManager(); if(!manager) return Response.json({error:"Acesso não autorizado"},{status:403});
  await syncOfficialPackages(manager.organizationId);
  const [plans,contracts,clientRows]=await Promise.all([
    getDb().select().from(packagePlans).where(eq(packagePlans.organizationId,manager.organizationId)).orderBy(asc(packagePlans.id)),
    getDb().select().from(packageContracts).where(eq(packageContracts.organizationId,manager.organizationId)).orderBy(asc(packageContracts.id)),
    getDb().select().from(clients).where(eq(clients.organizationId,manager.organizationId)),
  ]);
  return Response.json({plans:plans.map(p=>({...p,price:p.priceCents===null?null:p.priceCents/100})),contracts:contracts.map(c=>({...c,client:clientRows.find(x=>x.id===c.clientId)?.name||"Cliente",price:c.priceCents===null?null:c.priceCents/100,paid:c.paidCents/100}))});
}

export async function POST(request:Request){
  const manager=await getManager(); if(!manager)return Response.json({error:"Acesso não autorizado"},{status:403});
  const body=await request.json() as Record<string,unknown>;
  if(body.type==="contract"){
    const plan=(await getDb().select().from(packagePlans).where(and(eq(packagePlans.id,Number(body.planId)),eq(packagePlans.organizationId,manager.organizationId))).limit(1))[0];
    if(!plan)return Response.json({error:"Pacote não encontrado"},{status:404});
    const rows=await getDb().insert(packageContracts).values({organizationId:manager.organizationId,planId:plan.id,clientId:Number(body.clientId),petName:String(body.petName||"Pet"),usedSessions:0,totalSessions:plan.sessions,startDate:String(body.startDate),priceCents:body.price===null?null:Math.round(Number(body.price)*100),paidCents:body.paid?Math.round(Number(body.price)*100):0,paymentMethod:body.paid?String(body.method||"PIX"):null}).returning();
    return Response.json({contract:rows[0]},{status:201});
  }
  const rows=await getDb().insert(packagePlans).values({organizationId:manager.organizationId,name:String(body.name),sessions:Number(body.sessions),periodicity:String(body.periodicity),validityDays:Number(body.validityDays),priceCents:body.price===null?null:Math.round(Number(body.price)*100),serviceId:Number(body.serviceId),courtesy:String(body.courtesy||"Sem cortesia"),active:body.active!==false}).returning();
  return Response.json({plan:rows[0]},{status:201});
}

export async function PATCH(request:Request){
  const manager=await getManager(); if(!manager)return Response.json({error:"Acesso não autorizado"},{status:403}); const body=await request.json() as Record<string,unknown>;
  if(body.type==="plan"){await getDb().update(packagePlans).set({name:String(body.name),sessions:Number(body.sessions),periodicity:String(body.periodicity),validityDays:Number(body.validityDays),priceCents:body.price===null?null:Math.round(Number(body.price)*100),serviceId:Number(body.serviceId),courtesy:String(body.courtesy||"Sem cortesia"),active:body.active!==false}).where(and(eq(packagePlans.id,Number(body.id)),eq(packagePlans.organizationId,manager.organizationId)));return Response.json({updated:true});}
  if(body.type==="session"){const row=(await getDb().select().from(packageContracts).where(and(eq(packageContracts.id,Number(body.id)),eq(packageContracts.organizationId,manager.organizationId))).limit(1))[0];if(!row)return Response.json({error:"Contrato não encontrado"},{status:404});await getDb().update(packageContracts).set({usedSessions:Math.min(row.totalSessions,row.usedSessions+1)}).where(eq(packageContracts.id,row.id));}
  if(body.type==="payment")await getDb().update(packageContracts).set({paidCents:Math.round(Number(body.amount)*100),paymentMethod:String(body.method)}).where(and(eq(packageContracts.id,Number(body.id)),eq(packageContracts.organizationId,manager.organizationId)));
  return Response.json({updated:true});
}
