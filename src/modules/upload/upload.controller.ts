import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UploadedFiles,
  ParseFilePipeBuilder,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { UploadService } from "./upload.service";
import { Roles, Role } from "../../common/decorators/roles.decorator";
import { FileUploadDto } from "./dto/upload.dto";
import { Public } from "src/common/decorators/public.decorator";

@ApiTags("upload")
@ApiBearerAuth("access-token")
@Roles(Role.ADMIN)
// @Public()
@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("image")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Image file to upload",
    type: FileUploadDto,
  })
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.uploadService.uploadImage(file);
  }

  @Post("images")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Multiple image files",
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor("files", 10, { storage: memoryStorage() }))
  uploadImages(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 })
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ })
        .build({ fileIsRequired: true }),
    )
    files: Express.Multer.File[],
  ) {
    return this.uploadService.uploadImages(files);
  }
}
