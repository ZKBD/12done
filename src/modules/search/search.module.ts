import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { RecommendationsController } from './recommendations.controller';
import { SearchAgentsService } from './search-agents.service';
import { FavoritesService } from './favorites.service';
import { BrowsingHistoryService } from './browsing-history.service';
import { RecommendationsService } from './recommendations.service';
import { MailModule } from '@/mail';

@Module({
  imports: [MailModule],
  controllers: [SearchController, RecommendationsController],
  providers: [
    SearchAgentsService,
    FavoritesService,
    BrowsingHistoryService,
    RecommendationsService,
  ],
  exports: [
    SearchAgentsService,
    FavoritesService,
    BrowsingHistoryService,
    RecommendationsService,
  ],
})
export class SearchModule {}
