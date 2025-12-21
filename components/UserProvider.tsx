import { CURRENT_USER } from '@/Graphql/Queries';
import { useQuery } from '@apollo/client';
import { useUserStore } from '@/store/user.store';

const UserProvider = () => {
  const setUser = useUserStore((state) => state.setUser);
  useQuery(CURRENT_USER, {
    fetchPolicy: 'network-only',
    onCompleted: async (data) => {
      setUser(data.currentUser.user);
    },
    onError: (error) => {
      console.log(error);
    },
  });
  return null;
};

export default UserProvider;
