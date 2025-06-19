import { Timestamp } from 'firebase/firestore';

interface RestEntityInterface {
  uid?: string;
  created?: Date | Timestamp;
  updated?: Date | Timestamp;
}

export default RestEntityInterface;
