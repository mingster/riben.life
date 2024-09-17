//import { useEffect, useRef, useState } from 'react';
import type { ReactPlayerProps } from "react-player";
import ReactPlayer from "react-player/lazy";

export const VideoPlayer: React.FC<ReactPlayerProps> = () => {
  // this can contain YouTube URLs only
  const sources = [
    "https://youtu.be/oIgbl7t0S_w", //cti
    "https://youtu.be/oZdzzvxTfUY", //settv
    "https://youtu.be/oV_i3Hsl_zg", //daai
    //'https://youtu.be/bEZYrBMYNNg', //cctv4
  ];

  // HLS
  const sources2 = [
    {
      src: "http://play-flive.ifeng.com/live/06OLEEWQKN4.m3u8",
      type: "application/x-mpegURL",
    },
    {
      src: "https://stm37.tvcdn.org/livets/ch_jp_f/playlist.m3u8",
      type: "application/x-mpegURL",
    },
  ];

  /*
  const [calcWidth, setCalcWidth] = useState(0);
  useEffect(() => {
    const handleResize = () => {
      const newWindowDimensions = {
        width: window.innerWidth -64,
        height: window.innerHeight,
      };

      const viewportHeight = newWindowDimensions.height;
      const aspectRatio = 16 / 9;

      if (newWindowDimensions.width < viewportHeight * aspectRatio) {
        setCalcWidth(viewportHeight * aspectRatio);
      } else {
        setCalcWidth(newWindowDimensions.width);
      }
    };

    // Initial setup
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  */

  return (
    <div style={{}}>
      <ReactPlayer
        url={sources}
        controls={true}
        playing={true}
        loop={true}
        //height='100%'
        width="100%"
        //width={calcWidth ? calcWidth : '100%'}
        height="100vh"
        //width={calcWidth}
        //height={(calcWidth / 16) * 9}

        style={{
          /*
          transform: 'translate(-50%, -50%)',
          */
          objectFit: "cover",
          zIndex: -20,
          opacity: 1,
        }}
        config={{
          youtube: {
            playerVars: {
              modestbranding: 1,
              controls: 1,
            },
          },
          vimeo: {
            playerOptions: {
              controls: false,
            },
          },
        }}
      />
    </div>
  );
};

export default VideoPlayer;
