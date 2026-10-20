import { PageBody, PageHeader, PlatformPage } from '../components/PlatformUI';
import { TodayOverview, todayHeading } from '../components/TodayOverview';
import { getTodayOverview } from '../actions/today';

export async function TodayPage() {
  const overview = await getTodayOverview();
  return <PlatformPage section="Today" sectionHref="/platform/today">
    <PageHeader
      title={overview.today ? `Today · ${todayHeading(overview.today)}` : 'Today'}
      description={overview.timeZone
        ? `Arrivals, departures, and anything waiting on you. Dates follow ${overview.timeZone.replaceAll('_', ' ')}.`
        : 'Arrivals, departures, and anything waiting on you. Each stay is dated by its property’s time zone.'}
    />
    <PageBody>
      <TodayOverview overview={overview} />
    </PageBody>
  </PlatformPage>;
}

export default TodayPage;
