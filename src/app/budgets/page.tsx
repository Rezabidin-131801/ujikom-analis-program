import {redirect} from 'next/navigation';import {currentUser} from '@/lib/auth';import {prisma} from '@/lib/prisma';import {saveBudget,deleteBudget} from '@/app/actions';
export default async function Budgets(){const u=await currentUser();if(!u)redirect('/login');const now=new Date();
 const [cats,budgets,spent]=await Promise.all([
  prisma.category.findMany({where:{type:'EXPENSE',isActive:true,OR:[{ownerId:null},{ownerId:u.id}]}}),
  prisma.budget.findMany({where:{userId:u.id},include:{category:true},orderBy:[{year:'desc'},{month:'desc'}]}),
  prisma.transaction.groupBy({by:['categoryId'],where:{userId:u.id,type:'EXPENSE',occurredAt:{gte:new Date(now.getFullYear(),now.getMonth(),1),lt:new Date(now.getFullYear(),now.getMonth()+1,1)}},_sum:{amount:true}})
 ]);
 const spentMap=new Map(spent.map(x=>[x.categoryId,Number(x._sum.amount||0)]));
 return <main className="wrap"><h1>Anggaran bulanan per kategori</h1><div className="grid"><section className="card"><h2>Atur anggaran</h2><form className="form" action={saveBudget}>
 <label>Kategori<select name="categoryId">{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Tahun<input name="year" type="number" min="2000" max="2100" defaultValue={now.getFullYear()}/></label>
 <label>Bulan<input name="month" type="number" min="1" max="12" defaultValue={now.getMonth()+1}/></label><label>Nominal<input name="amount" type="number" min="0.01" step="0.01" required/></label><button disabled={!cats.length}>Simpan anggaran</button></form></section>
 <section className="card"><h2>Penggunaan bulan ini</h2>{budgets.filter(b=>b.year===now.getFullYear()&&b.month===now.getMonth()+1).map(b=>{const value=spentMap.get(b.categoryId)||0,pct=Math.min(100,value/Number(b.amount)*100);return <div key={b.id}><b>{b.category.name}</b><p className="muted">Terpakai Rp {value.toLocaleString('id-ID')} dari Rp {Number(b.amount).toLocaleString('id-ID')} ({pct.toFixed(0)}%)</p><div className="bar"><span style={{width:pct+'%'}}/></div></div>})}</section></div>
 <section className="card"><h2>Daftar anggaran</h2>{budgets.map(b=><div className="item" key={b.id}><p>{b.month}/{b.year} · {b.category.name} · Rp {Number(b.amount).toLocaleString('id-ID')}</p><form action={deleteBudget}><input type="hidden" name="id" value={b.id}/><button className="danger">Hapus</button></form></div>)}</section></main>;
}
