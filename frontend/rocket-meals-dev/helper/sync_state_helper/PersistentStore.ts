export class PersistentStore {
  // the key is just for easier access, the value is the actual key in the storage or syncState
  static test = "PersistentStore.test"

  static debug = "PersistentStore.debug"
  static debugAutoLogin = "PersistentStore.debugAutoLogin"

  static server_info = "PersistentStore.server_info"

}

type ValueOf<T> = T[keyof T];
export type PersistentStoreValues = ValueOf<typeof PersistentStore>;