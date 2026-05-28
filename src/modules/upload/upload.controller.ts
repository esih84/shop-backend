import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { UploadService } from "./upload.service";
import { Roles, Role } from "../../common/decorators/roles.decorator";
import { FileUploadDto } from "./dto/upload.dto";

@ApiTags("upload")
@ApiBearerAuth("access-token")
@Roles(Role.ADMIN)
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
    console.log(file);
    return this.uploadService.uploadImage(file);
  }
}
