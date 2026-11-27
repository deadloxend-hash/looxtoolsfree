// Browser token storage is readable by same-origin JavaScript; it is not HttpOnly.
export function createAuthStorage({local=()=>globalThis.localStorage,session=()=>globalThis.sessionStorage}={}){
 const memory=new Map(),preference='loox-auth-storage',sessionKey='loox-account-v1';
 const read=(factory,key)=>{try{return factory()?.getItem(key)??null;}catch{return null;}};
 const remove=(factory,key)=>{try{factory()?.removeItem(key);}catch{}};
 const selected=()=>((memory.get(preference)??read(session,preference)??read(local,preference))==='session'?[session]:[local,session]);
 const clean=(key,value)=>{if(key===sessionKey){try{const s=JSON.parse(value);delete s.provider_token;delete s.provider_refresh_token;return JSON.stringify(s);}catch{}}return value;};
 const storage={
  getItem(key){if(memory.has(key))return memory.get(key);for(const factory of selected()){const value=read(factory,key);if(value!==null)return clean(key,value);}return null;},
  setItem(key,value){value=clean(key,value);if(key===preference)memory.set(key,value);
   for(const factory of selected()){try{const target=factory();if(!target)continue;target.setItem(key,value);for(const other of [local,session])if(other!==factory)remove(other,key);if(key!==preference)memory.delete(key);return;}catch{}}
   // An explicit session-only choice must never become persistent localStorage.
   remove(local,key);remove(session,key);
   if(key===sessionKey){for(const factory of [local,session]){const old=read(factory,key);if(old!==null&&clean(key,old)!==value)throw Error('Browser storage cannot safely replace this account. Clear site data or use a browser that allows session storage.');}}
   memory.set(key,value);
  },
  removeItem(key){remove(local,key);remove(session,key);memory.delete(key);}
 };
 return {storage,hasStoredSession:()=>Boolean(storage.getItem(sessionKey))};
}
