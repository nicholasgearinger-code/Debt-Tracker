(function(){
 const url=window.CLEARPATH_SUPABASE_URL, key=window.CLEARPATH_SUPABASE_ANON_KEY;
 const configured=Boolean(url&&key&&window.supabase);
 const api=window.ClearPathAuth={configured,ready:false};
 if(!configured)return;
 const client=window.supabase.createClient(url,key);
 const $=id=>document.getElementById(id);
 const authPanel=$('cp-auth'),account=$('cp-account'),status=$('cp-auth-status');
 authPanel.hidden=false;
 let user=null, timer=null, busy=false;
 function message(s){status.textContent=s;}
 function localSnapshot(){return {debts:JSON.parse(localStorage.getItem('clearpath_debts')||'[]'),budget:JSON.parse(localStorage.getItem('clearpath_budget')||'[]'),bills:JSON.parse(localStorage.getItem('clearpath_bills')||'[]')};}
 function apply(d){const data={debts:Array.isArray(d?.debts)?d.debts:[],budget:Array.isArray(d?.budget)?d.budget:[],bills:Array.isArray(d?.bills)?d.bills:[]};for(const k of ['debts','budget','bills'])localStorage.setItem('clearpath_'+k,JSON.stringify(data[k]));window.ClearPathBoot(data);}
 async function enter(session){
   api.ready=false;user=session?.user||null;
   if(!user){authPanel.hidden=false;account.style.display='none';message('');return;}
   try{
     const {data,error}=await client.from('user_finances').select('data').eq('user_id',user.id).maybeSingle();
     if(error)throw error;
     const d=data?.data||{debts:[],budget:[],bills:[]};
     if(!localStorage.getItem('clearpath_legacy_backup')){
       const legacy=localSnapshot();
       if(['debts','budget','bills'].some(k=>legacy[k].length))localStorage.setItem('clearpath_legacy_backup',JSON.stringify(legacy));
     }
     apply(d);
     api.ready=true;authPanel.hidden=true;account.style.display='flex';$('cp-user-email').textContent=user.email||'Signed in';
   }catch(e){authPanel.hidden=false;message('Unable to load private account data: '+e.message);}
 }
 api.scheduleSave=function(snapshot){
   if(!api.ready||!user)return;
   clearTimeout(timer);
   const owner=user.id;
   timer=setTimeout(async()=>{
     if(!api.ready||user?.id!==owner)return;
     const {error}=await client.from('user_finances').upsert({user_id:owner,data:snapshot,updated_at:new Date().toISOString()},{onConflict:'user_id'});
     if(error)console.error('ClearPath sync failed:',error.message);
   },800);
 };
 $('cp-auth-form').addEventListener('submit',async e=>{
   e.preventDefault();message('Signing in...');
   const {error}=await client.auth.signInWithPassword({email:$('cp-email').value.trim(),password:$('cp-password').value});
   if(error)message(error.message);
 });
 $('cp-signup').addEventListener('click',async()=>{
   message('Creating account...');
   const {error,data}=await client.auth.signUp({email:$('cp-email').value.trim(),password:$('cp-password').value});
   message(error?error.message:(data.session?'Account created.':'Check your email to confirm your account.'));
 });
 $('cp-reset').addEventListener('click',async()=>{
   const email=$('cp-email').value.trim();if(!email){message('Enter your email first.');return;}
   const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
   message(error?error.message:'Check your email for password reset instructions.');
 });
 $('cp-signout').addEventListener('click',async()=>{
   api.ready=false;clearTimeout(timer);await client.auth.signOut();
   for(const k of ['debts','budget','bills'])localStorage.removeItem('clearpath_'+k);
   location.reload();
 });
 client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>enter(session),0);});
 client.auth.getSession().then(({data})=>enter(data.session)).catch(e=>message(e.message));
})();