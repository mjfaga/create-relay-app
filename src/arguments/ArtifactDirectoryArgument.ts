import { Command } from "commander";
import path from "path";
import { Filesystem } from "../Filesystem.js";
import { RelativePath } from "../RelativePath.js";
import { CliArguments, EnvArguments } from "../types.js";
import { h } from "../utils/index.js";
import { ArgumentBase } from "./ArgumentBase.js";

export class ArtifactDirectoryArgument extends ArgumentBase<"artifactDirectory"> {
  public name = "artifactDirectory" as const;
  public promptMessage =
    "Select, if needed, a directory to place all Relay artifacts in";

  constructor(private fs: Filesystem) {
    super();
    this.cliArg = "--artifact-directory";
  }

  registerCliOption(command: Command, env: EnvArguments): void {
    const flags = this.getCliFlags("-a", "<path>");

    command.option(flags, "directory to place all Relay artifacts in");
  }

  promptForValue(
    existingArgs: Partial<CliArguments>,
    env: EnvArguments
  ): Promise<CliArguments["artifactDirectory"]> {
    return this.showInquirerPrompt(
      {
        type: "input",
        validate: (input) => this.isValid(input, existingArgs, env),
      },
      existingArgs,
      env
    );
  }

  isValid(
    value: CliArguments["artifactDirectory"],
    existingArgs: Partial<CliArguments>,
    env: EnvArguments
  ): true | string {
    if (!value) {
      if (existingArgs.toolchain === "next") {
        return "Required";
      }

      // The artifactDirectory is optional.
      return true;
    }

    if (path.basename(value) !== "__generated__") {
      return `Last directory segment should be called ${h("__generated__")}`;
    }

    if (!this.fs.isSubDirectory(env.projectRootDirectory, value)) {
      return `Must be directory below ${h(env.projectRootDirectory)}`;
    }

    if (existingArgs.toolchain === "next") {
      const pagesDirectory = new RelativePath(
        env.projectRootDirectory,
        "./pages"
      );

      if (this.fs.isSubDirectory(pagesDirectory.abs, value)) {
        return `Can not be under ${h(pagesDirectory.rel)}`;
      }
    }

    return true;
  }

  async getDefaultValue(
    existingArgs: Partial<CliArguments>,
    env: EnvArguments
  ): Promise<CliArguments["artifactDirectory"]> {
    if (existingArgs.toolchain === "next") {
      // Artifacts need to be located outside the ./pages directory,
      // or they will be treated as pages.
      return "./__generated__";
    }

    return "";
  }
}
