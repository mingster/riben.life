import Container from "@/components/ui/container";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

const CategoryAdminPage: React.FC<pageProps> = async ({ params }) => {
  return <Container>admin Category</Container>;
};

export default CategoryAdminPage;
