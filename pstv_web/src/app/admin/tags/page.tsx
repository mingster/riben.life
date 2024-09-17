import Container from "@/components/ui/container";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

const TagsAdminPage: React.FC<pageProps> = async ({ params }) => {
  return <Container>admin Tags</Container>;
};

export default TagsAdminPage;
