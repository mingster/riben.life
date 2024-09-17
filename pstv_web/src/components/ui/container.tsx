//import { globalStyle } from '@/global-style';

interface ContainerProps {
  children: React.ReactNode;
}

const Container: React.FC<ContainerProps> = ({ children }) => {
  return (
    <div className="w-full min-h-screen pt-5">
      <div className="rounded min-h-[98%] xl:container xl:mx-auto">
        {/*bg-gradient-to-b from-indigo-500 via-purple-700 to-indigo-900*/}
        {children}
      </div>
    </div>
  );
};

export default Container;
