const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiGallery.tsx', 'utf8');

// Insert helper components and functions outside the main component
const helpers = `
const formatCount = (count: number) => {
  if (!count) return '';
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
  return count.toString();
};

const TagRow = ({ label, tags, type }: { label: string, tags: any[], type: string }) => {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex gap-2 items-start">
      <span className="text-gray-200 font-bold text-[15px] w-24 shrink-0 pt-0.5">{label}:</span>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag: any) => (
          <Link
            to={\`/?q=\${encodeURIComponent(type + ':"' + tag.name + '"')}\`}
            key={tag.id}
            className="flex items-baseline gap-1.5 bg-[#313131] hover:bg-primary hover:text-[#0B0C0F] text-gray-200 rounded px-2 py-0.5 text-[14px] font-bold transition-colors group"
          >
            <span>{tag.name}</span>
            {tag.count > 0 && (
              <span className="text-gray-400 group-hover:text-[#0B0C0F]/70 font-semibold text-[13px]">
                {formatCount(tag.count)}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

const timeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

const formatDate = (d: Date) => {
  return \`\${String(d.getMonth() + 1).padStart(2, '0')}/\${String(d.getDate()).padStart(2, '0')}/\${d.getFullYear()}\`;
};

`;

if (!content.includes('const formatCount')) {
  content = content.replace('export default function NHentaiGallery', helpers + 'export default function NHentaiGallery');
}

// Prepare grouped tags logic
const groupedLogic = `
  const groupedTags = gallery?.tags?.reduce((acc: any, tag: any) => {
    if (!acc[tag.type]) acc[tag.type] = [];
    acc[tag.type].push(tag);
    return acc;
  }, {} as Record<string, any[]>) || {};
`;

// Insert the groupedTags logic before the return if it's not there
if (!content.includes('const groupedTags =')) {
  content = content.replace('return (', groupedLogic + '\n  return (');
}

// Replace the Details section
const oldDetailsRegex = /\{\/\* Details \*\/\}[\s\S]*?\{\/\* Grid of Pages \(Card View\) \*\/\}/m;

const newDetails = `{/* Details */}
        <div className="flex-1 mt-4 md:mt-16 text-[#EDF1F5] max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-bold mb-3 leading-snug">
            {gallery.title?.english || gallery.title?.pretty}
          </h1>
          {gallery.title?.japanese && (
            <h2 className="text-gray-200 font-bold text-lg md:text-xl mb-6">
              {gallery.title.japanese}
            </h2>
          )}
          
          <div className="text-gray-400 font-bold text-[17px] mb-6">
            #{gallery.id}
          </div>

          <div className="flex flex-col gap-2.5">
            <TagRow label="Parodies" type="parody" tags={groupedTags.parody} />
            <TagRow label="Characters" type="character" tags={groupedTags.character} />
            <TagRow label="Tags" type="tag" tags={groupedTags.tag} />
            <TagRow label="Artists" type="artist" tags={groupedTags.artist} />
            <TagRow label="Groups" type="group" tags={groupedTags.group} />
            <TagRow label="Languages" type="language" tags={groupedTags.language} />
            <TagRow label="Categories" type="category" tags={groupedTags.category} />

            <div className="flex gap-2 items-start mt-1">
              <span className="text-gray-200 font-bold text-[15px] w-24 shrink-0 pt-0.5">Pages:</span>
              <span className="bg-[#313131] text-gray-200 rounded px-2 py-0.5 text-[14px] font-bold">
                {gallery.num_pages}
              </span>
            </div>
            
            {gallery.upload_date && (
              <div className="flex gap-2 items-start mt-1">
                <span className="text-gray-200 font-bold text-[15px] w-24 shrink-0 pt-0.5">Uploaded:</span>
                <span className="text-gray-300 text-[15px] font-semibold pt-0.5">
                  {timeAgo(new Date(gallery.upload_date * 1000))} ({formatDate(new Date(gallery.upload_date * 1000))})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Pages (Card View) */}`;

content = content.replace(oldDetailsRegex, newDetails);

fs.writeFileSync('src/nhentai/NHentaiGallery.tsx', content);
console.log('done');
