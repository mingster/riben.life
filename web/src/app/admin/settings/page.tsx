import Container from "@/components/ui/container";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

const SettingsAdminPage: React.FC<pageProps> = async ({ params }) => {
  return <Container>admin Settings</Container>;
};

export default SettingsAdminPage;
