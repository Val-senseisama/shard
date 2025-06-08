import { CURRENT_USER } from '@/Graphql/Queries';
import { useQuery } from '@apollo/client';
import AppStore from '~/helpers/AppStore';

const UserProvider = () => {
  useQuery(CURRENT_USER, {
    fetchPolicy: 'network-only',
    onCompleted: async (data) => {
      console.log('data', data);
      await AppStore.set('user', data.currentUser);
    },
    onError: (error) => {
      console.log(error);
    },
  });
  return null;
};

export default UserProvider;
