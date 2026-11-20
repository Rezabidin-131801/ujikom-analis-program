import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
const configuredSecret = process.env.AUTH_SECRET;
if (process.env.NODE_ENV === 'production' && (!configuredSecret || configuredSecret.length < 32)) {
  throw new Error('AUTH_SECRET wajib diatur minimal 32 karakter pada production.');
}
const secret = new TextEncoder().encode(configuredSecret || 'development-only-secret-change-this-now-000');
export async function setSession(userId:string){const token=await new SignJWT({userId}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('7d').sign(secret);(await cookies()).set('pfms_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:604800});}
export async function clearSession(){(await cookies()).delete('pfms_session');}
export async function currentUser(){const token=(await cookies()).get('pfms_session')?.value;if(!token)return null;try{const {payload}=await jwtVerify(token,secret);if(typeof payload.userId!=='string')return null;return prisma.user.findFirst({where:{id:payload.userId,isActive:true},select:{id:true,name:true,email:true,role:true}});}catch{return null;}}
