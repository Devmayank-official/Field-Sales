import { useClients } from "@/hooks/useClients";
import { useAllFridges } from "@/hooks/useFridges";
import { useAllVisits } from "@/hooks/useVisits";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowRight, Store, ThermometerSnowflake, MapPin } from "lucide-react";
import { Link } from "wouter";
import { format, differenceInDays } from "date-fns";
import { StatusBadge } from "@/components/ui/status-badge";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: fridges, isLoading: fridgesLoading } = useAllFridges();
  const { data: visits, isLoading: visitsLoading } = useAllVisits();

  const isLoading = clientsLoading || fridgesLoading || visitsLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-1/2 mb-8" />
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-40 rounded-2xl mt-8" />
      </div>
    );
  }

  const today = new Date();
  const todayVisits = visits?.filter(v => new Date(v.startedAt).toDateString() === today.toDateString()) || [];
  
  const clientsNeedingVisit = clients?.filter(c => {
    if (!c.lastVisitAt || c.status === "Inactive" || c.status === "Lead") return false;
    const threshold = c.visitFrequency ?? 14;
    return differenceInDays(today, new Date(c.lastVisitAt)) > threshold;
  }) || [];

  const criticalFridges = fridges?.filter(f => f.condition === "Critical" || f.condition === "Dead") || [];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial="hidden" animate="show" variants={container}
      className="flex flex-col min-h-full"
    >
      {/* Sticky page header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border px-6 py-3">
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground">{format(today, "EEEE, MMMM do")}</p>
      </div>

      <div className="p-6 space-y-8 flex-1">
        {/* Top Metrics */}
        <section className="grid grid-cols-2 gap-4">
          <motion.div variants={item}>
            <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20 hover-elevate">
              <CardContent className="p-5">
                <Store className="w-6 h-6 text-primary mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{clients?.length || 0}</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div variants={item}>
            <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20 hover-elevate">
              <CardContent className="p-5">
                <MapPin className="w-6 h-6 text-blue-500 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Visits Today</p>
                <p className="text-2xl font-bold">{todayVisits.length}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="hover-elevate">
              <CardContent className="p-5">
                <ThermometerSnowflake className="w-6 h-6 text-slate-500 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Active Assets</p>
                <p className="text-2xl font-bold">{fridges?.length || 0}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="bg-gradient-to-br from-destructive/10 to-transparent border-destructive/20 hover-elevate">
              <CardContent className="p-5">
                <AlertCircle className="w-6 h-6 text-destructive mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Action Needed</p>
                <p className="text-2xl font-bold text-destructive">{clientsNeedingVisit.length + criticalFridges.length}</p>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Actionable Alerts */}
        {(clientsNeedingVisit.length > 0 || criticalFridges.length > 0) && (
          <motion.section variants={item} className="space-y-4">
            <h2 className="text-xl font-bold">Needs Attention</h2>
            <div className="space-y-3">
              {criticalFridges.map(fridge => {
                const client = clients?.find(c => c.id === fridge.clientId);
                return (
                  <Link key={fridge.id} href={`/fridge/${fridge.id}`}>
                    <Card className="border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <StatusBadge status={fridge.condition} />
                            <span className="text-sm font-medium">Asset #{fridge.serialNo.slice(-4)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">at {client?.name}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}

              {clientsNeedingVisit.map(client => (
                <Link key={client.id} href={`/client/${client.id}`}>
                  <Card className="border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span className="font-semibold">{client.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Not visited in {client.lastVisitAt ? differenceInDays(today, new Date(client.lastVisitAt)) : '?'} days
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Recent Visits */}
        <motion.section variants={item} className="space-y-4">
          <h2 className="text-xl font-bold">Recent Visits</h2>
          {visits && visits.length > 0 ? (
            <div className="space-y-3">
               {visits.slice(0, 3).map(visit => {
                  const client = clients?.find(c => c.id === visit.clientId);
                  return (
                    <Card key={visit.id} className="hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{client?.name || "Unknown Client"}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(visit.startedAt), "MMM d, h:mm a")}
                            </p>
                          </div>
                          <StatusBadge status={visit.status} />
                        </div>
                      </CardContent>
                    </Card>
                  );
               })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                <MapPin className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p>No visits recorded yet.</p>
              </CardContent>
            </Card>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}
