There is an example chart using the ChartIQ library in `packages/chartiq/chartiq-sample`. This requires a ChartIQ license and as such is excluded from the lerna config for the repository, since we cannot distribute all the files required for it to build.

You can enable the example if you have a ChartIQ license as follows:

* Copy, link or extract the ChartIQ library to `packages/chartiq/common/` (such that you end up with `css`, `js` directories inside `packages/chartiq/common/`).
* Add `packages/chartiq/*` to the `packages` field in [lerna.json](../../../lerna.json) (at the root of the repository).
* Run `yarn install` at the root of the repository (again).
* Run `yarn develop` or `yarn build` at the root of the repository, or in the `chartiq-sample` directory.

### Visual Studio Code

Task:

* `serve-chartiq-sample`: serves the ChartIQ example on port 8880.

Debug launch configuration:

* `Launch Chrome to chartiq-sample`: runs the `serve-chartiq-sample` task in the background and launches a Chrome debugging session to it.
