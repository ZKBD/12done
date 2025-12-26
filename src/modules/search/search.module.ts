import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchAgentsService } from './search-agents.service';
import { FavoritesService } from './favorites.service';
import { MailModule } from '@/mail';

@Module({
  imports: [MailModule],
  controllers: [SearchController],
  providers: [SearchAgentsService, FavoritesService],
  exports: [SearchAgentsService, FavoritesService],
})
export class SearchModule {}
