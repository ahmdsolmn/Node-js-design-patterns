import { createGzip, createBrotliCompress, createDeflate } from "zlib";
import { createReadStream } from "fs";
import { PassThrough, pipeline } from "stream";
import { hrtime } from "process";

const FORMATS = ["gzip", "brotli", "deflate"];

const sizes = {
  original: 0,
  gzip: 0,
  brotli: 0,
  deflate: 0,
};

const times = {
  gzip: 0,
  brotli: 0,
  deflate: 0,
};

const _startTimeStamps = {
  gzip: 0,
  brotli: 0,
  deflate: 0,
};

const zlibLibraries = {
  gzip: createGzip,
  brotli: createBrotliCompress,
  deflate: createDeflate,
};

const monitor = (key) => {
  let stream = new PassThrough();
  stream.on("data", (chunk) => {
    sizes[key] += chunk.length;
  });
  return stream;
};

const startTimer = (key) => {
  let stream = PassThrough();
  stream.once("data", () => {
    _startTimeStamps[key] = hrtime.bigint();
  });
  return stream;
};

const endTimer = (key) => {
  let stream = PassThrough();
  stream.on("end", () => {
    let t = _startTimeStamps[key];
    times[key] = hrtime.bigint() - t;
  });
  return stream;
};

const overFlow = () => PassThrough({ highWaterMark: Number.MAX_SAFE_INTEGER });

let streams = 3;
const done = (err) => {
  if (err) {
    console.error("Pipeline failed.", err);
    process.exit(1);
  }
  if (--streams === 0) {
    console.log(times);
    console.log(sizes);
    console.log("Space Efficency:");
    FORMATS.forEach((format) =>
      console.log(`${format}:\t\t${(sizes[format] / sizes.original) * 100}%`)
    );
    console.log("Time Efficency:");
    FORMATS.forEach((format) => {
      console.log(`${format}:\t\t${times[format]}ns`);
    });
  }
};

const file = createReadStream("./file");
const measureOriginalFile = file.pipe(monitor("original"));

FORMATS.forEach((format) => {
  pipeline(
    measureOriginalFile,
    overFlow(),
    startTimer(format),
    zlibLibraries[format](),
    endTimer(format),
    monitor(format),
    done
  );
});
