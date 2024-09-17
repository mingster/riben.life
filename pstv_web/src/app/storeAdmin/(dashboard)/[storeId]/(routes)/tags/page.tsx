import Container from "@/components/ui/container";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

const TagsMgmtPage: React.FC<pageProps> = async ({ params }) => {
  return <Container>Store Tags</Container>;
};

export default TagsMgmtPage;
