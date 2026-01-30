FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["MidoLearning.Api.csproj", "./"]
RUN dotnet restore "MidoLearning.Api.csproj"

COPY . .
RUN dotnet build "MidoLearning.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MidoLearning.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 8080

COPY --from=publish /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "MidoLearning.Api.dll"]
