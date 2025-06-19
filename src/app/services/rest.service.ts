import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  DocumentReference,
  CollectionReference,
  WithFieldValue,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  collection, getDocs, setDoc, updateDoc, deleteDoc, addDoc, docData, collectionData
} from '@angular/fire/firestore';
import {RestEntity} from '../entities/rest.entity';
import {catchError, map, Observable, of} from 'rxjs';
import {LimitSearchParameter, SortSearchParameter, WhereSearchParameter} from '../types/firebase';
import {messageHandler} from '../handlers/message';

@Injectable({
  providedIn: 'root'
})
export abstract class RestService<T extends RestEntity> {
  protected firestore = inject(Firestore);

  protected constructor(
    protected collectionName: string
  ) {}

  /**
   * @description Get an entity by its UID from the collection.
   * @param {string} uid - The UID of the entity to fetch.
   * @return {Observable} - An Observable that emits the entity or a default value in case of error.
   */
  public _get(uid: string): Observable<T> {
    const docRef = doc(this.firestore, `${this.collectionName}/${uid}`);

    return docData(docRef).pipe(
      map((data) => {
        return data as T;
      }),
      catchError(error => {
        console.error('GET : Error fetching document', error);
        return of({} as T);
      })
    );
  }

  /**
   * @description Get an entity by its UID from the collection.
   * @param {string} uid - The UID of the entity to fetch.
   * @return {Promise} - A promise that resolves to the entity if found, or null if not found.
   */
  public async get(uid: string): Promise<T | null> {
    try {
      const docRef = doc(this.firestore, `${this.collectionName}/${uid}`);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as T;
    } catch (error) {
      console.error('GET : Error fetching document', error);
      return null;
    }
  }

  public _list(): Observable<T[]> {
    const collectionRef = collection(this.firestore, this.collectionName);
    const q = query(collectionRef, orderBy('created', 'desc'));

    return collectionData(q, { idField: 'uid' }).pipe(
      map((data) => {
        return data as T[];
      }),
      catchError(error => {
        console.error('LIST : Error fetching documents', error);
        return of([]);
      })
    );
  }

  /**
   * @description Get all entities from the collection.
   * @return {Promise} - A promise that resolves to an array of entities.
   */
  public async list(): Promise<T[]> {
    try {
      const collectionRef = collection(this.firestore, this.collectionName);
      const q = query(collectionRef, orderBy('created', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => doc.data() as T);
    } catch (error) {
      console.error('LIST : Error fetching documents', error);
      return [];
    }
  }

  public _search(queries: (WhereSearchParameter | SortSearchParameter | LimitSearchParameter)[]): Observable<T[]> {
    const collectionRef = collection(this.firestore, this.collectionName);
    let q = query(collectionRef);

    for (const p of queries) {
      if ('where' in p) {
        const whereParam = p as WhereSearchParameter;
        q = query(q, where(whereParam.where, whereParam.operator, whereParam.value));
      }
      if ('sortBy' in p) {
        const sortParam = p as SortSearchParameter;
        q = query(q, orderBy(sortParam.sortBy, sortParam.direction));
      }
      if ('limit' in p) {
        const limitParam = p as LimitSearchParameter;
        if (limitParam.limitToLast) {
          q = query(q, limit(limitParam.limit));
        } else {
          q = query(q, limit(limitParam.limit));
        }
      }
    }

    return collectionData(q, {idField: 'uid'}).pipe(
      map((data) => data as T[]),
      catchError(error => {
        console.error('SEARCH : Error fetching documents', error);
        return of([]);
      })
    );
  }

  /**
   * @description Search entities in the collection based on provided queries.
   * @param {Array<(WhereSearchParameter | SortSearchParameter | LimitSearchParameter)>} queries - An array of search queries.
   * @return {Promise} - A promise that resolves to an array of matching entities.
   */
  public async search(queries: (WhereSearchParameter | SortSearchParameter | LimitSearchParameter)[]): Promise<T[]> {
    try {
      const collectionRef = collection(this.firestore, this.collectionName);
      let q = query(collectionRef);

      for (const p of queries) {
        if ('where' in p) {
          const whereParam = p as WhereSearchParameter;
          q = query(q, where(whereParam.where, whereParam.operator, whereParam.value));
        }
        if ('sortBy' in p) {
          const sortParam = p as SortSearchParameter;
          q = query(q, orderBy(sortParam.sortBy, sortParam.direction));
        }
        if ('limit' in p) {
          const limitParam = p as LimitSearchParameter;
          q = query(q, limit(limitParam.limit));
        }
      }

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => doc.data() as T);
    } catch (error) {
      console.error('SEARCH : Error fetching documents', error);
      return [];
    }
  }

  /**
   * @description Create a new entity in the collection.
   * @param {Partial} entity - The entity data to be created.
   * @return {Promise<DocumentReference>} - A promise that resolves to the reference of the created document.
   */
  public async create(entity: Partial<T>): Promise<DocumentReference> {
    entity.created = new Date();
    entity.updated = new Date();
    let docRef: DocumentReference;

    try {
      if (entity.uid) {
        docRef = doc(this.firestore, `${this.collectionName}/${entity.uid}`);
        await setDoc(docRef, entity, { merge: false });

        return docRef;
      } else {
        const collectionRef = collection(this.firestore, this.collectionName) as CollectionReference<T>;

        docRef = await addDoc(collectionRef, entity as WithFieldValue<T>);
        const uid = docRef.id;

        await updateDoc(doc(this.firestore, this.collectionName, uid), { uid: uid });
        entity.uid = docRef.id;
      }

      return docRef;
    } catch (error) {
      console.error('CREATE : Error creating document', error);
      return Promise.reject({ message: messageHandler(this.collectionName, 'Create'), details: error });
    }
  }

  /**
   * @description Update an existing entity in the collection.
   * @param {Partial} entity - The entity data to be updated.
   * @return {Promise<void>} - A promise that resolves when the entity is updated.
   */
  public async update(entity: Partial<T>): Promise<void> {
    if (!entity.uid) {
      return Promise.reject({ message: 'entity.uid is null' });
    }

    const updatedEntity = {
      ...entity,
      updated: new Date()
    };

    try {
      const docRef = doc(this.firestore, `${this.collectionName}/${entity.uid}`);
      await updateDoc(docRef, updatedEntity);
    } catch (error) {
      console.error('UPDATE : Error updating document', error);
      return Promise.reject({ message: messageHandler(this.collectionName, 'Update'), details: error });
    }
  }

  /**
   * @description Delete an entity from the collection by its UID.
   * @param {string} uid - The UID of the entity to be deleted.
   * @return {Promise<void>} - A promise that resolves when the entity is deleted.
   */
  public async delete(uid: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${this.collectionName}/${uid}`);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('DELETE : Error deleting document', error);
      return Promise.reject({ message: messageHandler(this.collectionName, 'Delete'), details: error });
    }
  }
}
