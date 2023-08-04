import { Cartesian3, Color, Ion } from "cesium";
import { Viewer, Entity } from "resium";

import { Imagery } from "./Imagery";

Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkNDE4MTdhNy0yYjYzLTQwNjktODJiMy0xMWU2MjI4MTA4ODQiLCJpZCI6MjU5LCJpYXQiOjE2OTA5MDkwMjZ9.G-iUU-kiQeQx74_iQdhyc5IUrVbIIFDhFx7RFn94LaQ";

function App() {
  return (
    <Viewer full>
      <Entity
        name="Tokyo"
        position={Cartesian3.fromDegrees(139.767052, 35.681167, 100)}
        point={{ pixelSize: 10, color: Color.WHITE }}
        description="hoge"
      />
      <Imagery />
    </Viewer>
  );
}

export default App;
