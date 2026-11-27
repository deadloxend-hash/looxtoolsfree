// SDK storage must survive one browser storage area being unavailable.
export function createAuthStorage({local=()=>globalThis.localStorage,session=()=>globalThis.sessionStorage}={}){
 const memory=new Map();
 const read=(factory,key)=>{try{return factory()?.getItem(key)??null;}catch{return null;}};
 const remove=(factory,key)=>{try{factory()?.removeItem(key);}catch{}};
 const selected=()=>read(local,'loox-auth-storage')==='session'?[session,local]:[local,session];
 const storage={
  getItem(key){for(const factory of selected()){const value=read(factory,key);if(value!==null)return value;}return memory.get(key)??null;},
  setItem(key,value){const stores=selected();for(const factory of stores){try{const target=factory();if(!target)continue;target.setItem(key,value);for(const other of stores)if(other!==factory)remove(other,key);memory.delete(key);return;}catch{}}
   memory.set(key,value);
  },
  removeItem(key){remove(local,key);remove(session,key);memory.delete(key);}
 };
 return {storage,hasStoredSession:()=>Boolean(storage.getItem('loox-account-v1'))};
}
